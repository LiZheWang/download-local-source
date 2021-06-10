const fs = require('fs');
const path = require('path');
const fss = require('fs-extra');
const download = require('download');
const fg = require('fast-glob');

class Index {
  constructor(options) {
    this.options = Object.assign({
      outputName: 'dist',
      outputPath: './',
      // 搜索范围， ['../test/**/*.js', '../test/**/*.html']
      searchScope: '',
      matchReg: null
    }, options || {});
    if (!this.options.searchScope) { console.error('请配置 searchScope') }
    if (!this.options.matchReg) { console.error('请配置 matchReg') }

    // 扫描到的本地文件
    this.files = [];
    // 解析出来的文件
    this.downloadFiles = [];
    // 绑定的事件
    this.events = [];
    // 输出目录
    this.outputPath = path.resolve(process.cwd(), `${this.options.outputPath}${this.options.outputName}`);

    this.parseDirectory();
  }

  parseDirectory () {
    this.files = [];
    const filePaths = fg.sync(this.options.searchScope);
    if (filePaths && filePaths.length) {
      this.files = filePaths.map(filePath => {
        const filePathResolve = path.resolve(process.cwd(), filePath);
        let parse = path.parse(filePathResolve);
        return {
          ...parse,
          fullPath: filePathResolve
        }
      });
      this.parseFiles();
      return false;
    }
    console.warn('searchScope范围内没有找到文件');
  }

  parseFiles () {
    if (this.files.length === 0) return ;
    this.files.forEach(fileItem => {
      const fileContent = fs.readFileSync(fileItem.fullPath, { encoding: 'utf-8' });
      const match = fileContent.match(this.options.matchReg);
      if (match && match.length) {
        match.forEach(async (downloadUrl) => {
          if (downloadUrl.startsWith('//')) downloadUrl = 'http:' + downloadUrl;
          let urlParse = new URL(downloadUrl);
          let outputName = path.join(this.outputPath, urlParse.pathname);
          try {
            fss.outputFileSync(outputName, await download(downloadUrl));
            this.emit('download', { ...fileItem, outputName, downloadUrl });
          } catch (err) {
            this.emit('error', err, { ...fileItem, outputName, downloadUrl });
          }
        });
      }
    });
  }

  on (type, fn = noop) {
    this.events.push({type, fn});
  }

  emit (type, ...args) {
    this.events.filter(ev => ev.type === type).forEach(ev => ev.fn.apply(this, args));
  }


}

function noop () {}

module.exports = Index;
