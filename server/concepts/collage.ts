import { Filter, ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotAllowedError, NotFoundError } from "./errors";

// export interface CollageOptions {
//   backgroundColor?: string;
// }


//make content like an optional parameter in the routes like give it a default empty Set
export interface CollageDoc extends BaseDoc {
  author: ObjectId;
  name:string;
  content: Array<ObjectId>;
  editors:Array<ObjectId>;
  
}

export default class CollageConcept {
  public readonly collages = new DocCollection<CollageDoc>("collages");

  async create(author: ObjectId, name:string, content: Array< ObjectId>, editors:Array<ObjectId>) {
    //await this.canCreate(author, name, flair, content, editors);
    const _id = await this.collages.createOne({ author, name, content,editors});
    return { msg: "Collage successfully created!", collage: await this.collages.readOne({ _id }) };
  }
  async getOne(query: Filter<CollageDoc>) {
    const collage = await this.collages.readOne(query);
    return collage;
  }
  async getCollages(query: Filter<CollageDoc>) {
    const collages = await this.collages.readMany(query, {
      sort: { dateUpdated: -1 },
    });
    return collages;
  }
  
  private async hasContent(_id: ObjectId,content:ObjectId) {
    const collage = await this.collages.readOne({ _id });
    
    if (!collage) {
        throw new NotFoundError(`Collage ${_id} does not exist!`);
    }
    const hasContent:boolean = collage.content.toString().includes(content.toString());
    
    if (!hasContent){
        throw new NotFoundError(`Cannot find post ${content} in collage ${_id}`);
    }
    
    
  }
  private async notHasContent(_id: ObjectId,content:ObjectId) {
    const collage = await this.collages.readOne({ _id });
    
    if (!collage) {
        throw new NotFoundError(`Collage ${_id} does not exist!`);
    }
    const hasContent:boolean = collage.content.toString().includes(content.toString());
    
    if (hasContent){
        throw new NotFoundError(`Post ${content} already in collage ${_id}`);
    }
    
    
  }
  private async notHasEditor(_id: ObjectId,editor:ObjectId) {
    const collage = await this.collages.readOne({ _id });
    
    if (!collage) {
        throw new NotFoundError(`Collage ${_id} does not exist!`);
    }
    const hasEditor:boolean = collage.editors.toString().includes(editor.toString());
    
    if (hasEditor){
        throw new NotFoundError(`${editor} is already an editor of collage ${_id}`);
    }
    
    
  }
  async deleteContent( _id: ObjectId,content:ObjectId) {
    const collage = await this.collages.readOne({ _id });
    if (!collage) {
        throw new NotFoundError(`Collage ${_id} does not exist!`);
    }
    
    let index = -1;
    for (let i = 0; i < collage.content.length; i++){
        if(collage.content[i].toString() === content.toString()){
            index = i;

        }
    }
    collage.content.splice(index, 1);
    return {msg:"Post deleted from collage successfully!", collage: await this.collages.readOne({ _id })}; 
  }
  async addContent(_id: ObjectId,content:ObjectId) {
    const collage = await this.collages.readOne({ _id });
    if (!collage) {
        throw new NotFoundError(`Collage ${_id} does not exist!`);
    }
    await this.notHasContent(_id,content);
    await this.isNotNestedCollage(content);
    collage.content.push(content); 
    await this.collages.updateOne({ _id }, collage);
    return { msg: "Successfully added content to collage!", collage: await this.collages.readOne({ _id }) };
    
  }
  async addEditor(_id: ObjectId,editor:ObjectId) {
    const collage = await this.collages.readOne({ _id });
    if (!collage) {
        throw new NotFoundError(`Collage ${_id} does not exist!`);
    }
    await this.notHasEditor(_id,editor);
    collage.editors.push(editor); 
    await this.collages.updateOne({ _id }, collage);
    return { msg: "Successfully added editor to collage!", collage: await this.collages.readOne({ _id }) };
    
  }
  async removeEditor(_id: ObjectId,editor:ObjectId) {
    const collage = await this.collages.readOne({ _id });
    if (!collage) {
        throw new NotFoundError(`Collage ${_id} does not exist!`);
    }
    await this.isEditor(_id,editor);
    let index = -1;
    for (let i = 0; i < collage.editors.length; i++){
        if(collage.editors[i].toString() === editor.toString()){
            index = i;
        }
    }
    
    collage.editors.splice(index, 1);
    await this.collages.updateOne({ _id }, collage);
    return { msg: "Successfully removed editor from collage!", collage: await this.collages.readOne({ _id }) };
    
  }
  
  async getByAuthor(author: ObjectId) {
    return await this.getCollages({ author });
  }
  


  async update(_id: ObjectId, update: Partial<CollageDoc>) {
    
    this.sanitizeUpdate(update);
    await this.collages.updateOne({ _id }, update);
    return { msg: "Collage successfully updated!" };
  }

  async delete(_id: ObjectId) {
    
    await this.collages.deleteOne({ _id });
    return { msg: "Collage deleted successfully!" };
  }
  
  
  async isAuthor(user: ObjectId, _id: ObjectId) {

    const collage = await this.collages.readOne({ _id });
    if (!collage) {
        throw new NotFoundError(`Collage ${_id} does not exist!`);
      }
    if (collage.author.toString() !== user.toString()) {
      throw new CollageAuthorNotMatchError(user, _id);
    }
  }
  async isEditor(user: ObjectId, _id: ObjectId) {

    const collage = await this.collages.readOne({ _id });
    if (!collage) {
        throw new NotFoundError(`Collage ${_id} does not exist!`);
      }
    const isEditor:boolean = collage.editors.toString().includes(user.toString());
    if (!isEditor) {
      throw new CollageEditorNotMatchError(user, _id);
    }
  }
  
  private async isNotNestedCollage( content_id: ObjectId) {
    //test may or may not work if content is a string 
    const isContentCollage = await this.collages.readOne({content_id});
    //for content in collageContents
    if (isContentCollage) {
        const isNestedCollage = isContentCollage.content.map(async (_id) => await this.collages.readOne({_id})).every((x) => x === null);
        if (isNestedCollage){
            throw new BadValuesError("Cannot put a collage with a collage in it inside of a collage! (no doubly nested collages)");
        }
      }
  } 

  private sanitizeUpdate(update: Partial<CollageDoc>) {
    // Make sure the update cannot change the author.
    const allowedUpdates = ["name", "content", "flair", "editors"];
    for (const key in update) {
      if (!allowedUpdates.includes(key)) {
        throw new NotAllowedError(`Cannot update '${key}' field!`);
      }
      
    }
  }
}
export class CollageEditorNotMatchError extends NotAllowedError {
    constructor(
      public readonly author: ObjectId,
      public readonly _id: ObjectId,
    ) {
      super("{0} is not an editor of collage {1}!", author, _id);
    }
  }
  
export class CollageAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of collage {1}!", author, _id);
  }
}
