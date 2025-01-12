import Annotation from './annotation.js';
import { renderBox } from '../utils/tutils.js';

import { RawImage } from '../extern/transformers.min.js';

export default class SentimentAnnotation extends Annotation {
  section = 'menu-text';
  name = 'sentiment';
  title = '4.1 Sentiment Analysis';
  dtype = 'q8';
  task = 'sentiment-analysis';
  model = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
  itype = 'text';
  pylink = 'https://distant-viewing.github.io/dv-demo/4.1_sentiment.html';
  dataToDownload = {};
  exampleNames = ['afi', 'sotu-text', 'amazon', 'macron-text'];

  constructor() {
    super();
    this.setup();
  }

  buildOutput() {
    const output = document.getElementById('annotation-output');
    output.innerHTML = '';

    const searchControl = document.createElement('div');
    const searchBar = document.createElement('input');

    searchControl.id = 'search-bar-control';
    searchControl.className = 'control mx-6 my-3';
    searchBar.id = 'search-bar';
    searchBar.className = 'input is-success';
    searchBar.type = 'text';
    searchBar.placeholder = 'input text';
    searchBar.disabled = true;

    output.appendChild(searchControl).appendChild(searchBar);

    document.getElementById('search-bar').addEventListener('keypress', (e) => {
      if (this.worker !== null) {
        this.handleManualInput(e);
      } else {
      }
    });
  }

  afterLoad() {
    this.startTime = new Date().getTime() / 1000;
    this.dataToDownload = { manualInput: [] };

    document.getElementById('search-bar').disabled = false;
    this.handleInput(
      'This is a great example!',
      '',
      'manualInput',
      0,
      1,
    );
  }

  startWorkers() {
    if (this.worker !== null) {
      this.worker.terminate();
    }

    this.worker = new Worker(
      new URL('../workers/worker.js', import.meta.url),
      {
        type: 'module',
      },
    );
  }

  async handleManualInput(e) {
    this.dataToDownload = { manualInput: [] };

    if (e.key === 'Enter') {
      [...document.getElementsByClassName('output-paragraph')].forEach(
        (element) => {
          element.remove();
        },
      );
      [...document.getElementsByClassName('output-result-classify')].forEach(
        (element) => {
          element.remove();
        },
      );

      this.handleInput(
        document.getElementById('search-bar').value,
        '',
        'manualInput',
        0,
        1,
      );

      //document.getElementById("search-bar").disabled = true;
      //setClass(document.getElementById("search-bar-control"), "is-loading", true);
    }
  }

  async handleUpload(uploadInput) {
    this.dataToDownload = {};
    const reader = new FileReader();

    reader.onload = (e) => {
      let lines = e.target.result.split('\n');
      lines = lines.filter((s) => (s !== ""));
      this.dataToDownload[uploadInput.target.files[0].name] = Array.apply(
        null,
        Array(lines.length),
      ).map(function () {});

      for (let i = 0; i < lines.length; i++) {
        this.handleInput(
          lines[i],
          lines[i],
          uploadInput.target.files[0].name,
          i,
          lines.length,
        );
      }
    };

    reader.readAsText(uploadInput.target.files[0]);
  }

  async handleExample(value) {
    this.dataToDownload = {};

    fetch(value[0].url)
      .then((res) => {
        return res.text();
      })
      .then((data) => {
        let lines = data.split('\n');
        lines = lines.filter((s) => (s !== ""));
        this.dataToDownload[value[0].url] = Array.apply(
          null,
          Array(lines.length),
        ).map(function () {});

        for (let i = 0; i < lines.length; i++) {
          this.handleInput(lines[i], lines[i], value[0].url, i, lines.length);
        }
      });
  }

  async handleInput(objUrl, caption, fname, index, inputLen) {
    const output = document.getElementById('annotation-output');

    const par = document.createElement('p');
    const spRes = document.createElement('span');

    par.className = 'output-paragraph';
    spRes.className = 'output-result-classify pb-5';

    par.innerHTML = objUrl;

    output.appendChild(par);
    output.appendChild(spRes);

    this.worker.postMessage({
      type: 'pipeline',
      image: objUrl,
      fileName: fname,
      index: index,
      inputLen: inputLen,
    });
  }

  handleOutput(dt) {
    const outputResults = document.getElementsByClassName(
      'output-result-classify',
    );

    let outMsg = '<strong>Predicted Sentiment</strong>: ';
    outMsg += `<span class="has-text-success">${dt.output[0].label}</span> `;
    outMsg += `(${(100 * dt.output[0].score).toFixed(2)}%)`;

    outputResults[dt.input.index].innerHTML = outMsg;
    this.dataToDownload[dt.input.fileName][dt.input.index] = {
      input: dt.input.image,
      output: dt.output[0],
    };
  }

  handleDownload() {
    document.getElementById('search-bar').disabled = false;
    document
      .getElementById('annotation-download')
      .addEventListener('click', () => {
        const jsonString = JSON.stringify(this.dataToDownload);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'data.json';
        link.click();
        URL.revokeObjectURL(link.href);
      });
  }
}
