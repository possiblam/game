import './styles/main.css';
import './styles/map.css';
import './styles/stages.css';
import './styles/animations.css';
import { initApp } from './app.js';

const rootEl = document.getElementById('app');
if (rootEl) {
  initApp(rootEl);
}
