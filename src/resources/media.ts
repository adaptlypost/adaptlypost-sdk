import { AdaptlyPostError } from '../errors.js';
import type { HttpClient, RequestOptions } from '../http.js';
import type { RequestBody, ResponseBody, UploadMimeType } from '../types.js';

export interface FileToUpload {
  fileName: string;
  mimeType: UploadMimeType;
  data: Blob | ArrayBuffer | Uint8Array;
}

export interface UploadedFile {
  fileName: string;
  publicUrl: string;
  key: string | undefined;
}

export class Media {
  constructor(private readonly http: HttpClient) {}

  getUploadUrls(body: RequestBody<'getUploadUrls'>, options?: RequestOptions): Promise<ResponseBody<'getUploadUrls'>> {
    return this.http.post('/upload-urls', body, options);
  }

  async upload(files: FileToUpload | FileToUpload[], options?: RequestOptions): Promise<UploadedFile[]> {
    const list = Array.isArray(files) ? files : [files];
    const { urls = [] } = await this.getUploadUrls(
      { files: list.map(({ fileName, mimeType }) => ({ fileName, mimeType })) },
      options,
    );
    return Promise.all(
      list.map(async (file, index) => {
        const target = urls[index];
        if (!target?.uploadUrl || !target.publicUrl) {
          throw new AdaptlyPostError(`No upload URL came back for ${file.fileName}`);
        }
        await this.http.putFile(target.uploadUrl, file.data, file.mimeType, options?.signal);
        return { fileName: file.fileName, publicUrl: target.publicUrl, key: target.key };
      }),
    );
  }
}
