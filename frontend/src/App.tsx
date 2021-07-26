import { BrowserRouter as Router, Route } from 'react-router-dom';
import Navbar from './Navbar';
import Main from './Main';
import Usage from './Usage';
import './App.css';

export default function App() {
  return (
    <div className="App">
      <Router>
        <Navbar />
        <Route exact path="/" component={Main} />
        <Route exact path="/usage" component={Usage} />
      </Router>
    </div>
  );
}
