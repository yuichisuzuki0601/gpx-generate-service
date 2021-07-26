import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle, faFileCode } from '@fortawesome/free-regular-svg-icons';

export default function Navbar() {
  return (
    <div className="navbar">
      <Link className="link left" to="/">
        <span>GPXジェネレーター for Xcode</span>
      </Link>
      <Link className="link" to="/usage">
        <FontAwesomeIcon className="icon" icon={faQuestionCircle} />
        <span>使い方</span>
      </Link>
      <a
        className="link"
        target="_blank"
        rel="noreferrer"
        href="https://github.com/yuichisuzuki0601/gpx-generate-service"
      >
        <FontAwesomeIcon className="icon" icon={faFileCode} />
        <span>ソースコード by yuichisuzuki0601</span>
      </a>
    </div>
  );
}
