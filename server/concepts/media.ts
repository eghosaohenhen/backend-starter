import { Filter, ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";



export interface MediaDoc extends BaseDoc {
  author: ObjectId;
  content: string;
}

export default class MediaConcept {
    public readonly medias:DocCollection<MediaDoc>;
    constructor(name: string){
        this.medias = new DocCollection<MediaDoc>(name);
    }
    async upload(author: ObjectId, content:string) {
        const _id = await this.medias.createOne({ author, content});
        return { msg: "Media successfully uploaded!", media: await this.medias.readOne({ _id }) };
    }
    async getMediaById(_id: ObjectId) {
        
        return await this.medias.readOne({ _id });
    }
    async getMedia(query: Filter<MediaDoc>) {
        const medias = await this.medias.readMany(query, {
          sort: { dateUpdated: -1 },
        });
        return medias;
    }
    async delete(_id: ObjectId) {
        await this.medias.deleteOne({ _id });
        return { msg: "Media deleted successfully!" };
    }
    async isAuthor(user: ObjectId, _id: ObjectId) {

        const media = await this.medias.readOne({ _id });
        if (!media) {
            throw new NotFoundError(`Media ${_id} does not exist!`);
          }
        if (media.author.toString() !== user.toString()) {
          throw new MediaAuthorNotMatchError(user, _id);
        }
      }
  }
  export class MediaAuthorNotMatchError extends NotAllowedError {
    constructor(
      public readonly author: ObjectId,
      public readonly _id: ObjectId,
    ) {
      super("{0} is not the author of media {1}!", author, _id);
    }
  }
  export class MediaUploadFailureError extends NotAllowedError {
    constructor(
      public readonly author: ObjectId,
      public readonly media: string,
    ) {
      super("{0} failed to upload {1}!", author, media);
    }
  }