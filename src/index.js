import AWS from 'aws-sdk';
import s3Stream from 's3-upload-stream';

export default class ObjectStorageAdapter {
  constructor({ authentication, params = {} }) {
    this.timeout = params.connectionTimeout || 1000 * 60 * 3;
    this.authentication = authentication;
    this.params = params;
    this.s3Params = this.params.s3 || {};
    this.filenameTransformer = name => name;

    AWS.config.httpOptions = { timeout: this.timeout };

    if (typeof params.filenameTransformer === 'function') {
      this.filenameTransformer = params.filenameTransformer;
    }
  }

  async getWriteStream({ container, filename, metaData = {}, rawMeta = {} }) {
    const s3 = new AWS.S3(this.authentication);
    const newFilename = this.filenameTransformer(filename);
    const extension = filename.split('.').pop();
    const metadata = {
      'X-Object-Meta-filename': newFilename,
      'X-Object-Meta-originalfilename': filename,
      'X-Object-Meta-extension': extension,
      'Content-Disposition': `attachment; filename="${newFilename}"`,
      ...rawMeta,
    };

    Object.keys(metaData).forEach((key) => {
      if (metaData[key]) {
        metadata[`X-Object-Meta-${key}`] = metaData[key];
      }
    });

    const writeStream = s3Stream(s3).upload({
      Bucket: container || this.params.defaultContainer,
      Key: newFilename,
      Metadata: metadata,
      ...this.s3Params,
    });

    writeStream.on('uploaded', function (response) {
      this.emit('success', {
        location: response.Location,
        filename: response.Key,
        container: response.Bucket,
      });
    });

    return writeStream;
  }

  async delete(container, file) {
    if (!container || !file) {
      throw new Error('you must provide container, and full file path');
    }

    const s3 = new AWS.S3(this.authentication);

    return new Promise((resolve, reject) => {
      s3.deleteObject({
        Bucket: container,
        Key: file,
      }, (err, data) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  }

  async getObject(container, file) {
    if (!container || !file) {
      throw new Error('you must provide container, and full file path');
    }

    const s3 = new AWS.S3(this.authentication);

    return new Promise((resolve, reject) => {
      s3.getObject({
        Bucket: container,
        Key: file,
      }, (err, data) => {
        if (err && err.message === 'The specified key does not exist.') {
          return resolve();
        } else if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  }

  async getObjectMeta(container, file) {
    if (!container || !file) {
      throw new Error('you must provide container, and full file path');
    }

    const s3 = new AWS.S3(this.authentication);

    return new Promise((resolve, reject) => {
      s3.headObject({
        Bucket: container,
        Key: file,
      }, (err, data) => {
        if (err && err.message === null) {
          return resolve();
        } else if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  }

  async copyObject(container, oldFile, newFile) {
    if (!container || !newFile || !oldFile) {
      throw new Error('validation error');
    }

    const s3 = new AWS.S3(this.authentication);

    return new Promise((resolve, reject) => {
      s3.copyObject({
        Bucket: container,
        CopySource: oldFile,
        Key: newFile,
      }, (err, data) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  }

  async butchDelete(container, files) {
    if (!container || !Array.isArray(files)) {
      throw new Error('you must provide container, array of files');
    }

    const s3 = new AWS.S3(this.authentication);

    return new Promise((resolve, reject) => {
      s3.deleteObjects({
        Bucket: container,
        Delete: {
          Objects: files,
          Quiet: true,
        },
      }, (err, data) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  }

  async list(container, prefix, max = 50, marker = '') {
    if (!container) {
      throw new Error('you must provide container');
    }

    const s3 = new AWS.S3(this.authentication);

    return new Promise((resolve, reject) => {
      s3.listObjects({
        Bucket: container,
        Prefix: prefix,
        Marker: marker,
        MaxKeys: max,
      }, (err, data) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  }

  async nestedDelete(container, prefix = '', marker = '') {
    if (!container || prefix.length < 3) {
      throw new Error('you must provide container and prefix');
    }

    const response = await this.list(container, prefix, 50, marker);

    if (!response.Contents || !response.Contents[0]) {
      return true;
    }

    await this.butchDelete(container, response.Contents.map(({ Key }) => ({ Key })));

    return this.nestedDelete(container, prefix, response.Contents.reverse()[0].Key);
  }

  async nestedCb(container, prefix = '', cb, marker = '') {
    if (!container || prefix.length < 3 || typeof cb !== 'function') {
      throw new Error(`validation fail ${JSON.stringify({ container, prefix, cb }, null, 2)}`);
    }

    const response = await this.list(container, prefix, 50, marker);

    if (!response.Contents || !response.Contents[0]) {
      return true;
    }

    if (Array.isArray(response.Contents)) {
      await cb(response.Contents);
    }

    return this.nestedCb(container, prefix, cb, response.Contents.reverse()[0].Key);
  }
}
