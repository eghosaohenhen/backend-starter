import { Filter, ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";
//TODO add main collage feature 

export interface SpaceDoc extends BaseDoc {
  author: ObjectId;
  name: string;
  members: Array<ObjectId>;
  featured_collage:ObjectId;
  picture?: ObjectId; 
  bio?: string;
  posts:Array<ObjectId>; 
  collages: Array<ObjectId>; 
}

export default class SpaceConcept {
  public readonly spaces = new DocCollection<SpaceDoc>("spaces");

  async create(author: ObjectId, name: string, members: Array<ObjectId>, posts: Array<ObjectId>, featured_collage:ObjectId,collages:Array<ObjectId>,picture?:ObjectId, bio?:string) {
    await this.isSpaceNameUnique(name);
    const _id = await this.spaces.createOne({ author, name, members, posts,featured_collage, collages, picture, bio});
    return { msg: "Space successfully created!", space: await this.spaces.readOne({ _id }) };
  }

  async getSpaces(query: Filter<SpaceDoc>) {
    const spaces = await this.spaces.readMany(query, {
      sort: { dateUpdated: -1 },
    });
    return spaces;
  }
  async getSpaceBySpacename(name:string){
    const space = await this.spaces.readOne({ name:name });
    if (space === null) {
      throw new NotFoundError(`Space ${name} not found!`);
    }
    return space;
    
  }
//   async updateFeaturedCollage(_id:ObjectId, new_collage:ObjectId){
//     const space = await this.spaces.readOne({ _id });
//     if (!space) {
//         throw new NotFoundError(`Space ${_id} does not exist!`);
//     }
//     const isInSpace:boolean = space.collages.toString().includes(new_collage.toString());
//     if (!isInSpace) {
//       throw new NotAllowedError(`Space ${space.name} doesn't have ${new_collage}`);
//     }
//     //const isInSpace = await this.spaces.
//     //const space = await this.spaces.readOne({ featured_collage: new_collage });
//     await this.spaces.updateOne({ _id }, {featured_collage:new_collage});
//     // if (space === null) {
//     //   throw new NotFoundError(`Space ${name} not found!`);
//     // }
//     return { msg: `Successfully added ${new_collage} to space!`, space: await this.spaces.readOne({ _id }) };
    
  //}
  async isNotInSpace(_id:ObjectId, item: ObjectId, item_type: string, space?:SpaceDoc){
    let new_space;
    if (!space) {
        new_space = await this.spaces.readOne({ _id });
        if (!new_space) {
            throw new NotFoundError(`Space ${_id} does not exist!`);
        }
        
    }
    const used_space = space? space: new_space;
    if (!used_space){
        throw new NotFoundError(`Space ${_id} does not exist (aliasing error)!`);
    }
    let item_array;
    if (item_type === "user"){
        item_array = used_space.members;
    }else if (item_type === "post"){
        item_array = used_space.posts;
    }else if (item_type === "collage"){
        item_array = used_space.collages;
    }else{
        throw new NotAllowedError(`Item type must be either "user", "post", or "collage"!`);
    }
    
    const hasItem:boolean = item_array.toString().includes(item.toString());
    
    if (hasItem){
        throw new NotFoundError(`${item} is already an ${item_type} in space ${used_space.name}`);
    }
    return item_array;
  }

  async addItem(_id:ObjectId, item: ObjectId, item_type: string) {
    const space = await this.spaces.readOne({ _id });
    if (!space) {
        throw new NotFoundError(`Space ${_id} does not exist!`);
    }
    const item_array = await this.isNotInSpace(_id,item,item_type,space);
    item_array.push(item);
    
    await this.spaces.updateOne({ _id }, space);
    return { msg: `Successfully added ${item_type} to space!`, space: await this.spaces.readOne({ _id }) };
  }
  async deleteItem(_id:ObjectId, member: ObjectId,item_type: string) {
    const space = await this.spaces.readOne({ _id });
    if (!space) {
        throw new NotFoundError(`Space ${_id} does not exist!`);
    }
    let item_array;
    if (item_type === "user"){
        item_array = space.members;
    }else if (item_type === "post"){
        item_array = space.posts;
    }else if (item_type === "collage"){
        item_array = space.collages;
    }else{
        throw new NotAllowedError(`Item type must be either "user", "post", or "collage" exist!`);
    }
    let index = -1;
    for (let i = 0; i < item_array.length; i++){
        if(item_array[i].toString() === member.toString()){
            index = i;
        }
    }
    
    item_array.splice(index, 1);
   
    await this.spaces.updateOne({ _id }, space);
    return {msg:`${item_type} ${member} deleted from space successfully!`, space: await this.spaces.readOne({ _id })}; 
  }

  async getByMember(member: ObjectId) {
    return await this.getSpaces({ member });
  }

  async update(_id: ObjectId, update: Partial<SpaceDoc>) {
    this.sanitizeUpdate(update);
    await this.spaces.updateOne({ _id }, update);
    return { msg: "Space successfully updated!" };
  }

  async delete(_id: ObjectId) {
    await this.spaces.deleteOne({ _id });
    return { msg: "Space deleted successfully!" };
  }

  async isAuthor(user: ObjectId, _id: ObjectId) {
    const space = await this.spaces.readOne({ _id });
    if (!space) {
      throw new NotFoundError(`Space ${_id} does not exist!`);
    }
    if (space.author.toString() !== user.toString()) {
      throw new SpaceAuthorNotMatchError(user, _id);
    }
  }
  async isMember(user: ObjectId, _id: ObjectId) {

    const space = await this.spaces.readOne({ _id });
    if (!space) {
        throw new NotFoundError(`Space ${_id} does not exist!`);
      }
    const isEditor:boolean = space.members.toString().includes(user.toString());
    if (!isEditor) {
      throw new SpaceMemberNotMatchError(user, _id);
    }
  }
  private async isSpaceNameUnique(spacename: string) {
    if (await this.spaces.readOne({ spacename })) {
      throw new NotAllowedError(`Space with name ${spacename} already exists!`);
    }
  }
  private sanitizeUpdate(update: Partial<SpaceDoc>) {
    // Make sure the update cannot change the author.
    const allowedUpdates = ["picture", "bio", "members", "featured_collage"];
    for (const key in update) {
      if (!allowedUpdates.includes(key)) {
        throw new NotAllowedError(`Cannot update '${key}' field!`);
      }
    }
  }
}
export class SpaceMemberNotMatchError extends NotAllowedError {
    constructor(
      public readonly author: ObjectId,
      public readonly _id: ObjectId,
    ) {
      super("{0} is not a member of space {1}!", author, _id);
    }
}
export class SpaceAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of space {1}!", author, _id);
  }
}
