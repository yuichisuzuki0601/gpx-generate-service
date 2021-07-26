import express, { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import util from 'util';
import childProcess from 'child_process';
import ejs from 'ejs';
import moment from 'moment';
import { serverConfig } from '../../config';

const DATETIME_FORMAT = 'YYYY/MM/DD HH:mm:ss';
const nowString = () => moment().format(DATETIME_FORMAT);

const app = express();
app.use(express.json({ limit: '500mb' }));
app.use(
  express.urlencoded({
    limit: '500mb',
    extended: true,
    parameterLimit: 1000 * 1000
  })
);
if (process.env.ENV === 'prod') {
  app.use(express.static(path.resolve(__dirname, '../../frontend/build')));
}

const { port } = serverConfig;
app.listen(port, () => {
  console.log(`Node.js is listening to PORT: ${port}`);
});

const router = Router();
app.use('/api', router);

router.use((req, _, next) => {
  console.log('----------');
  console.log('path:', req.originalUrl);
  console.log('started:', nowString());
  next();
  console.log('finished:', nowString());
});

const SPEED_MAP: { [key: string]: number } = {
  walk: 0.0000125,
  bicycle: 0.000025,
  car: 0.0001
};

router.post('/generateGpx', async (req, res) => {
  try {
    const { body } = req;
    const { title, speed, markers } = body;

    // make points
    const points = [];
    if (markers.length === 1) {
      points.push({ ...markers[0], marked: true });
    } else {
      for (let i = 0; i <= markers.length - 2; ++i) {
        const start = markers[i];
        const end = markers[i + 1];
        if (!start || !end) {
          continue;
        }
        const incrementalLat = end.lat - start.lat;
        const incrementalLng = end.lng - start.lng;
        const directionLat = incrementalLat > 0 ? 'plus' : 'minus';
        const directionLng = incrementalLng > 0 ? 'plus' : 'minus';
        const theta = Math.atan(incrementalLat / incrementalLng);
        const delta = SPEED_MAP[speed];
        const deltaLat = Math.abs(delta * Math.sin(theta));
        const deltaLng = Math.abs(delta * Math.cos(theta));
        points.push({ ...start, marked: true });
        let cursor: { lat: number; lng: number; marked: boolean } = points[points.length - 1];
        while (directionLng === 'plus' ? cursor.lng < end.lng : cursor.lng > end.lng) {
          cursor = {
            lat: directionLat === 'plus' ? cursor.lat + deltaLat : cursor.lat - deltaLat,
            lng: directionLng === 'plus' ? cursor.lng + deltaLng : cursor.lng - deltaLng,
            marked: false
          };
          points.push(cursor);
        }
      }
    }
    points[points.length - 1].marked = true;

    // make gpx
    const gpx = (
      await ejs.renderFile(path.resolve(__dirname, 'gpx-template.ejs'), {
        title,
        timestamp: nowString(),
        points
      })
    ).replace(/\s{2}\n/g, '');

    // server operations
    const { gpxSaveMode, gpxSaveDirectory, additionalCommand } = serverConfig;
    if (gpxSaveMode) {
      await fs.mkdir(gpxSaveDirectory, { recursive: true });
      await fs.writeFile(`${gpxSaveDirectory}/${body.title}.gpx`, gpx);
    }
    if (additionalCommand) {
      const exec = util.promisify(childProcess.exec);
      const result = await exec(additionalCommand);
      console.log(result.stdout);
    }

    // return
    res.status(200).send(gpxSaveMode ? 'saved' : gpx);
  } catch (e) {
    console.error(e);
    res.status(500).json(e);
  }
});
