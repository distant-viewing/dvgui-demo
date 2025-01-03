import Annotation from './annotation.js';
import { renderBox } from '../utils/tutils.js';

import { RawImage } from '../extern/transformers.min.js';

export default class ClassifyAnnotation extends Annotation {
  section = 'menu-image';
  name = 'classify';
  title = '2.1 Image Classification';
  dtype = 'q8';
  task = 'image-classification';
  model = 'Xenova/resnet-50';
  itype = 'image';
  pylink = 'https://distant-viewing.github.io/dv-demo/2.1_classification.html';
  dataToDownload = {};

  constructor() {
    super();
    this.setup();
  }

  buildOutput() {
    const output = document.getElementById('annotation-output');
    output.innerHTML = '';
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

  async handleUpload(uploadInput) {
    const filesArray = uploadInput.target.files;
    const imageArray = [...filesArray].filter((s) => s.type.includes('image'));

    this.dataToDownload = {};

    for (let i = 0; i < imageArray.length; i++) {
      const objUrl = URL.createObjectURL(imageArray[i]);
      this.handleInput(
        objUrl,
        filesArray[i].name,
        filesArray[i].name,
        i,
        filesArray.length,
      );
    }
  }

  async handleExample(value) {
    this.dataToDownload = {};

    for (let i = 0; i < value.length; i++) {
      this.handleInput(
        value[i].url,
        value[i].caption,
        value[i].url,
        i,
        value.length,
      );
    }
  }

  async handleInput(objUrl, caption, fname, index, inputLen) {
    const output = document.getElementById('annotation-output');
    const imageContainer = document.createElement('div');
    const imageInner = document.createElement('div');
    const img = document.createElement('img');
    const sp = document.createElement('span');
    const spRes = document.createElement('span');

    imageContainer.className = 'image-container';
    imageInner.className = 'inner-image';
    img.className = 'inner-image-img';
    sp.className = 'output-label';
    spRes.className = 'output-result-classify';

    img.src = objUrl;
    sp.innerHTML = caption;
    output
      .appendChild(imageContainer)
      .appendChild(imageInner)
      .appendChild(img);

    output.appendChild(sp);
    output.appendChild(spRes);
    await img.decode();

    this.worker.postMessage({
      type: 'pipeline',
      image: img.src,
      fileName: fname,
      index: index,
      inputLen: inputLen,
    });
  }

  handleOutput(dt) {
    const outputResults = document.getElementsByClassName(
      'output-result-classify',
    );

    let outMsg = '<strong>Predicted Categories</strong>: ';

    for (let i = 0; i < dt.output.length; i++) {
      outMsg += `<span class="has-text-success">${dt.output[i].label}</span> `;
      outMsg += `(${(dt.output[i].score * 100).toFixed(2)}%)`;
      if (i !== dt.output.length - 1) {
        outMsg += '; ';
      }
    }

    outputResults[dt.input.index].innerHTML = outMsg;
    this.dataToDownload[dt.input.fileName] = dt.output;
  }

  handleDownload() {
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
