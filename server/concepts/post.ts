import { Filter, ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotAllowedError, NotFoundError } from "./errors";

// export interface PostOptions {
//   backgroundColor?: string;
// }
export enum FlairType {
  Tip = 'Tip',
  Artwork = 'Artwork',
  Inspo = 'Inspo',
  General = 'General',
};


export interface PostDoc extends BaseDoc {
  author: ObjectId;
  content: ObjectId;
  flair: FlairType; 
}

export default class PostConcept {
  public readonly posts = new DocCollection<PostDoc>("posts");

  async create(author: ObjectId, content: ObjectId, flair:FlairType) {
    const _id = await this.posts.createOne({ author, content, flair});
    return { msg: "Post successfully created!", post: await this.posts.readOne({ _id }) };
  }

  async getPosts(query: Filter<PostDoc>) {
    const posts = await this.posts.readMany(query, {
      sort: { dateUpdated: -1 },
    });
    return posts;
  }
  async getOne(query: Filter<PostDoc>) {
    const post = await this.posts.readOne(query);
    return post;
  }

  async getByAuthor(author: ObjectId) {
    return await this.getPosts({ author });
  }
  async getByFlair(flair: FlairType) {
    return await this.getPosts({ flair});
  }
  async getById(_id: ObjectId) {
    return await this.getPosts({ _id});
  }

  async update(_id: ObjectId, update: Partial<PostDoc>) {
    this.sanitizeUpdate(update);
    await this.posts.updateOne({ _id }, update);
    return { msg: "Post successfully updated!" };
  }

  async delete(_id: ObjectId) {
    await this.posts.deleteOne({ _id });
    return { msg: "Post deleted successfully!" };
  }

  async isAuthor(user: ObjectId, _id: ObjectId) {
    const post = await this.posts.readOne({ _id });
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }
    if (post.author.toString() !== user.toString()) {
      throw new PostAuthorNotMatchError(user, _id);
    }
  }

  private sanitizeUpdate(update: Partial<PostDoc>) {
    // Make sure the update cannot change the author.
    const allowedUpdates = ["content", "flair"];
    for (const key in update) {
      if (!allowedUpdates.includes(key)) {
        throw new NotAllowedError(`Cannot update '${key}' field!`);
      }
    }
  }
}

export class PostAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of post {1}!", author, _id);
  }
}

export class InvalidPostFlairError extends BadValuesError {
  constructor(
    public readonly flair: string,
    public readonly flairOptions: Array<String>,
  ) {
    super("{0} is not a valid post flair. Post flairs must be one of the following{1}!", flair, flairOptions);
  }
}
