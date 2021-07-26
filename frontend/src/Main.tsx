import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarker, faUndo, faEraser, faPen } from '@fortawesome/free-solid-svg-icons';
import { Loader } from '@googlemaps/js-api-loader';
import { clientConfig } from '@/config';

const markers: google.maps.Marker[] = [];
const lines: google.maps.Polyline[] = [];

const getSavedMarkers = () => {
  return JSON.parse(localStorage.getItem('markers') || '[]');
};

const putMarker = (map: google.maps.Map, position: google.maps.LatLng) => {
  markers.push(new google.maps.Marker({ map, position }));
  if (markers.length < 2) {
    return;
  }
  const start = markers[markers.length - 2].getPosition();
  const end = markers[markers.length - 1].getPosition();
  if (start && end) {
    lines.push(
      new google.maps.Polyline({
        map,
        path: [start, end],
        strokeColor: '#00F',
        strokeOpacity: 0.5,
        strokeWeight: 5
      })
    );
  }
};

export default function Main() {
  const rootElement = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState('');
  const [speed, setSpeed] = useState('bicycle');
  const [isOpenDialog, setOpenDialog] = useState(false);
  const [gpx, setGpx] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 's' && e.metaKey) {
      generateGpx();
      e.preventDefault();
      return false;
    }
    if (e.key === 'z' && e.metaKey && e.shiftKey) {
      reset();
      e.preventDefault();
      return false;
    }
    if (e.key === 'z' && e.metaKey) {
      back();
      e.preventDefault();
      return false;
    }
  };

  const handleChangeTitle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTitle(value);
    localStorage.setItem('title', value);
  };

  const handleChangeSpeed = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSpeed(value);
    localStorage.setItem('speed', value);
  };

  const back = () => {
    if (markers.length > 0) {
      markers[markers.length - 1].setMap(null);
      markers.length -= 1;
    }
    if (lines.length > 0) {
      lines[lines.length - 1].setMap(null);
      lines.length -= 1;
    }
    const savedMarkers = getSavedMarkers();
    if (savedMarkers.length > 0) {
      savedMarkers.length -= 1;
    }
    localStorage.setItem('markers', JSON.stringify(savedMarkers));
  };

  const reset = () => {
    if (markers.length > 0 && window.confirm('地点を全部消去します。よろしいですか？')) {
      markers.forEach((m) => m.setMap(null));
      markers.length = 0;
      lines.forEach((l) => l.setMap(null));
      lines.length = 0;
      localStorage.setItem('markers', '[]');
    }
  };

  const generateGpx = async () => {
    if (markers.length === 0) {
      alert('地点を1つ以上指定してください');
      return;
    }
    if (title === '') {
      alert('タイトルを設定してください');
      return;
    }
    try {
      const { data } = await axios.post('api/generateGpx', {
        title,
        speed,
        markers: markers.map((m) => m.getPosition())
      });
      if (data === 'saved') {
        alert('成功しました');
      } else {
        setGpx(data);
        setOpenDialog(true);
      }
    } catch (e) {
      console.error(e);
      alert('error');
    }
  };

  const initMap = () => {
    localStorage.removeItem('zoom');
    localStorage.removeItem('center');
    window.location.reload();
  };

  const closeDialog = () => {
    setOpenDialog(false);
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([gpx]));
    a.download = `${title}.gpx`;
    a.click();
  };

  useEffect(() => {
    setTitle(localStorage.getItem('title') || '');
    setSpeed(localStorage.getItem('speed') || 'bicycle');
    (async () => {
      try {
        window.google = await new Loader({
          apiKey: clientConfig.googleMapApiKey
        }).load();
        const mapSettings = clientConfig.defaultMapSettings;
        const savedZoom = localStorage.getItem('zoom');
        if (savedZoom) {
          mapSettings.zoom = Number(savedZoom);
        }
        const savedCenter = localStorage.getItem('center');
        if (savedCenter) {
          mapSettings.center = JSON.parse(savedCenter);
        }
        const map = new google.maps.Map(document.getElementById('map') as HTMLElement, {
          ...mapSettings,
          draggableCursor: 'crosshair'
        });
        map.addListener('zoom_changed', () => {
          localStorage.setItem('zoom', String(map.getZoom()));
        });
        map.addListener('center_changed', () => {
          const center = map.getCenter();
          if (center) {
            localStorage.setItem('center', JSON.stringify(center.toJSON()));
          }
        });
        map.addListener('click', (e: { latLng: google.maps.LatLng }) => {
          const { latLng } = e;
          putMarker(map, latLng);
          const savedMarkers = getSavedMarkers();
          savedMarkers.push(latLng.toJSON());
          localStorage.setItem('markers', JSON.stringify(savedMarkers));
        });
        getSavedMarkers().forEach((m: { lat: number; lng: number }) => {
          putMarker(map, new google.maps.LatLng(m));
        });
      } catch (e) {
        console.error(e);
        alert('error');
      }
    })();
    const node = rootElement.current;
    if (node) {
      node.focus();
    }
  }, []);

  return (
    <div ref={rootElement} tabIndex={0} onKeyDown={handleKeyDown}>
      <div id="map"></div>
      <div className="control-container">
        <div className="control">
          <label htmlFor="title">タイトル:</label>
          <input id="title" onChange={handleChangeTitle} value={title} />
        </div>
        <div className="control">
          <label htmlFor="speed">速度:</label>
          <select id="speed" onChange={handleChangeSpeed} value={speed}>
            <option value="walk">徒歩</option>
            <option value="bicycle">自転車</option>
            <option value="car">乗用車</option>
          </select>
        </div>
        <button className="control" onClick={initMap}>
          <FontAwesomeIcon className="icon" icon={faMapMarker} />
          <span>初期地点表示</span>
        </button>
        <button className="control" onClick={back}>
          <FontAwesomeIcon className="icon" icon={faUndo} />
          <span>一つ戻す(⌘ + z)</span>
        </button>
        <button className="control" onClick={reset}>
          <FontAwesomeIcon className="icon" icon={faEraser} />
          <span>リセット(⌘ + shift + z)</span>
        </button>
        <button className="control" onClick={generateGpx}>
          <FontAwesomeIcon className="icon" icon={faPen} />
          <span>生成する(⌘ + s)</span>
        </button>
      </div>
      {isOpenDialog && (
        <div className="dialog-container">
          <div className="dialog">
            <div className="dialog-header">
              <span className="dialog-title">GPX生成結果</span>
              <button className="dialog-btn-close" onClick={closeDialog}>
                閉じる
              </button>
            </div>
            <div className="dialog-content">
              <pre>{gpx}</pre>
            </div>
            <div className="dialog-footer">
              <button className="dialog-btn-download" onClick={download}>
                ファイルとして保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
