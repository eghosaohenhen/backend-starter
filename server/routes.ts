import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import {
  Collage,
  CollageFavorite,
  Comment,
  Media,
  Post,
  PostFavorite,
  Space,
  SpaceFavorite,
  User, UserFavorite, WebSession
} from "./app";
import { CommentDoc } from "./concepts/comment";
import { NotAllowedError, NotFoundError } from "./concepts/errors";
import { FlairType, InvalidPostFlairError } from "./concepts/post";
import { SpaceDoc } from "./concepts/space";
import { UserDoc } from "./concepts/user";
import { WebSessionDoc } from "./concepts/websession";
import Responses from "./responses";

class Routes {
  @Router.get("/session")
  async getSessionUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await User.getUsers();
  }

  @Router.get("/users/:username")
  async getUser(username: string) {
    return await User.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: WebSessionDoc, username: string, password: string) {
    WebSession.isLoggedOut(session);
    return await User.create(username, password);
  }

  @Router.patch("/users")
  async updateUser(session: WebSessionDoc, update: Partial<UserDoc>) {
    const user = WebSession.getUser(session);
    return await User.update(user, update);
  }

  @Router.delete("/users")
  async deleteUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    WebSession.end(session);
    return await User.delete(user);
  }

  @Router.post("/login")
  async logIn(session: WebSessionDoc, username: string, password: string) {
    const u = await User.authenticate(username, password);
    WebSession.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: WebSessionDoc) {
    WebSession.end(session);
    return { msg: "Logged out!" };
  }
  
  //favorite routes
  @Router.get("/favorites/:item_id")
  async getFavorites(item_id: ObjectId, item_type: string) {
    if(item_id){
      if (item_type.toLowerCase() === "user"){
        return await UserFavorite.getFavorites(item_id);
      }else if (item_type.toLowerCase() === "space"){
        return await SpaceFavorite.getFavorites(item_id);
      }else if (item_type.toLowerCase() === "collage"){
        return await CollageFavorite.getFavorites(item_id);
      }else if (item_type.toLowerCase() === "post"){
        return await PostFavorite.getFavorites(item_id);
      }else{
        throw new NotAllowedError(`${item_type} is not an allowed favorite item type. Allowed item types are "user",
      "collage","space", and "post".`);

      }
    }else{
      throw new NotAllowedError('must provide item id');//idkTODO
    }
  }
  @Router.post("/favorites/:item_id")
  async createFavorite(session: WebSessionDoc, item_id: ObjectId, item_type:string) {
    //console.log("here in create favorite")
    const user = WebSession.getUser(session);
    
      if (item_type.toLowerCase() === "user"){
        return await UserFavorite.addFavorite(user, item_id);
      }else if (item_type.toLowerCase() === "space"){
        return await SpaceFavorite.addFavorite(user, item_id);
      }else if (item_type.toLowerCase() === "collage"){
        return await CollageFavorite.addFavorite(user,item_id);
      }else{
        throw new NotAllowedError(`${item_type} is not an allowed favorite item type. Allowed item types are "user",
      "collage","space".`);

      }
    
    
    
    //for a favorite do I return the add like a Friend or return a msg & post like a post 
    //what's the difference between the two
    //return { msg: created.msg, post: await Responses.post(created.post) };
  }
  //different router for posts because they go into a collage when favorited.
  @Router.post("/favorites/:post_id/collages/:collage_id")
  async favoritePost(session: WebSessionDoc, item_id: ObjectId, collage_id: ObjectId) {
    const user = WebSession.getUser(session);
    await Collage.addContent(collage_id, item_id); 
    return await PostFavorite.addFavorite(user, item_id);


  }
  @Router.delete("/favorites/:_id")
  async deleteFavorite(session: WebSessionDoc, _id: ObjectId, item_type:string) {
    const user = WebSession.getUser(session);
    if (item_type.toLowerCase() === "user"){
      await UserFavorite.isFavorited(user, _id);
      return await UserFavorite.addFavorite(user, _id);
    }else if (item_type.toLowerCase() === "space"){
      await SpaceFavorite.isFavorited(user, _id);
      return await SpaceFavorite.addFavorite(user, _id);
    }else if (item_type.toLowerCase() === "collage"){
      await CollageFavorite.isFavorited(user, _id);
      return await CollageFavorite.addFavorite(user,_id);
    }else{
      throw new NotAllowedError(`${item_type} is not an allowed favorite item type. Allowed item types are "user",
    "collage","space".`);

    }
    
  }
  @Router.delete("/favorites/:_id/collages/:collage_id")
  async unfavoritePost(session: WebSessionDoc, _id: ObjectId, collage_id:ObjectId) {
    const user = WebSession.getUser(session);
    await PostFavorite.isFavorited(user, _id);
    await Collage.isEditor(user,collage_id);
    const deleted = await Collage.deleteContent(collage_id, _id); 
    const unfavorited = PostFavorite.removeFavorite(user,_id);
    return {collage_msg: deleted.msg, collage:deleted.collage, favorite_msg:unfavorited};
  }


  //post routes 
  @Router.post("/posts/:content_id")
  async createPost(session: WebSessionDoc, content_id:ObjectId,flair:FlairType, caption?:string) {
    if(!Object.keys(FlairType).includes(flair.toString())){
      throw new InvalidPostFlairError(flair.toString(),Object.keys(FlairType));
    }
    const user = WebSession.getUser(session);
    
    const created = caption?await Post.create(user, content_id,flair,caption):await Post.create(user, content_id,flair);
    return { msg: created.msg, post: created.post };

  }
  @Router.get("/posts")
  async getPosts(author?: string, flair?: FlairType, _id?: ObjectId) {
    let posts;
    if (author) {
      const id = (await User.getUserByUsername(author))._id;
      posts = await Post.getByAuthor(id);
    } else if (flair){
      if(!Object.keys(FlairType).includes(flair.toString())){
        throw new InvalidPostFlairError(flair.toString(),Object.keys(FlairType));
      }
      posts = await Post.getPosts({flair:flair});
    }else if (_id){
      posts = await Post.getPosts({id:_id});
    }else {
      posts = await Post.getPosts({});
    }
    return Responses.posts(posts);
  }
  //TODO I dont want to update posts 
  // @Router.patch("/posts/:_id")
  // async updatePost(session: WebSessionDoc, _id: ObjectId, update: Partial<PostDoc>) {
  //   const user = WebSession.getUser(session);
  //   await Post.isAuthor(user, _id);
  //   return await Post.update(_id, update);
  // }
  //how to delete posts from posts and groups can I just call the group router in posts
  @Router.delete("/posts/:_id")
  async deletePost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    return Post.delete(_id);
  }

  //media routes 
  @Router.post("/media")
  async uploadMedia(session: WebSessionDoc, content: string) {
    
    const user = WebSession.getUser(session);
    const upload = await Media.upload(user, content);
    return { msg: upload.msg, post: upload.media };
   
  }
  @Router.get("/media")
  async getMedia(_id?:ObjectId,username?:string ) {
    if (_id){
      return await Media.getMediaById(_id);
    } else if (username){
      const user = await User.getUserByUsername(username);
      return await Media.getMedia({author:user});
    } else {
      return await Media.getMedia({});
    }
  }
  @Router.delete("/media")
  async deleteMedia(session:WebSessionDoc, _id:ObjectId) {
    const user = WebSession.getUser(session);
    await Media.isAuthor(user,_id);
    return await Media.delete(_id);
    
  }

  //collage routes 
  @Router.post("/collages")
  async createCollage(session: WebSessionDoc,name:string) {
    
    const user = WebSession.getUser(session);
    
    const created = await Collage.create(user,name, [],[user]);
    return { msg: created.msg, collage: created.collage };

  }

  @Router.get("/collages")
  async getCollage(_id?:ObjectId, editorname?: string,authorname?: string) {
    
    if (_id) {
      return await Collage.getCollages({id:_id});
    } else if (editorname){
      //$in?
      //$or: [{ from: user }, { to: user }],
      const id = (await User.getUserByUsername(editorname))._id;
      return await Collage.getCollages({editors:id}); 
    } else if (authorname){
      const id = (await User.getUserByUsername(authorname))._id;
      return await Collage.getCollages({author:id}); 
    }
    else {
      return await Collage.getCollages({});
    }
    //return Responses.posts(posts);

  }

  @Router.delete("/collages")
  async deleteCollage(session:WebSessionDoc,_id:ObjectId) {
    const user = WebSession.getUser(session);
    await Collage.isAuthor(user,_id);
    return await Collage.delete(_id);
  }
  //CHECK idk if it is patch or post 
  @Router.post("/collages/:_id/content")
  async addContent(session:WebSessionDoc,_id:ObjectId, content_id:ObjectId) {
    
    const user = WebSession.getUser(session);
    await Collage.isEditor(user, _id);
    const added = await Collage.addContent(_id, content_id);
    return { msg: added.msg, collage: added.collage };

  }
  @Router.delete("/collages/:_id/content")
  async deleteContent(session:WebSessionDoc,_id:ObjectId, content_id:ObjectId) {
    
    const user = WebSession.getUser(session);
    await Collage.isEditor(user, _id);
    const added = await Collage.deleteContent(_id, content_id);
    return { msg: added.msg, collage: added.collage };

    
  }
  @Router.post("/collages/:_id/editor")
  async addEditor(session:WebSessionDoc,_id:ObjectId, editorname:string) {
    
    const user = WebSession.getUser(session);
    await Collage.isEditor(user, _id);
    const editor_id = (await User.getUserByUsername(editorname))._id;
    const added = await Collage.addEditor(_id, editor_id);
    return { msg: added.msg, collage: added.collage };

  }
  @Router.post("/collages/:_id/editor")
  async removeEditor(session:WebSessionDoc,_id:ObjectId, editorname:string) {
    
    const user = WebSession.getUser(session);
    await Collage.isAuthor(user, _id);
    const editor_id = (await User.getUserByUsername(editorname))._id;
    const added = await Collage.addEditor(_id, editor_id);
    return { msg: added.msg, collage: added.collage };

  }
  
  //space routes 
  @Router.post("/spaces")
  async createSpaces(session: WebSessionDoc,name:string, picture?:ObjectId, bio?:string) {
    
    const user = WebSession.getUser(session);
    const featured_collage = await Collage.create(user,name,[],[user]);
    const collage = featured_collage.collage;
    if(!collage){
      throw new NotFoundError(`Collage is ${collage}`);
    }
    
    const created = await Space.create(user,name, [user], [], collage._id, [collage._id],picture, bio);
    return { msg: created.msg, space: created.space };

  }
  @Router.patch("/space/:name")
  async updateSpace(session: WebSessionDoc, name: string, update: Partial<SpaceDoc>) {
    const user = WebSession.getUser(session);
    const _id = (await Space.getSpaceBySpacename(name))._id;
    await Space.isAuthor(user, _id);
    return await Space.update(_id, update);
  }

  @Router.get("/spaces")
  async getSpace(authorname?: string, membername?:string, spacename?:string) {
    
    if (spacename) {
      const id = (await Space.getSpaceBySpacename(spacename))._id;
      return await Space.getSpaces({id:id});
    } else if (authorname){
      const id = (await User.getUserByUsername(authorname))._id;
      return await Space.getSpaces({author:id}); 
    }else if (membername){
      const id = (await User.getUserByUsername(membername))._id;
      return await Space.getSpaces({members:id}); 
    }
    else {
      return await Space.getSpaces({});
    }
   
  }

  @Router.delete("/spaces/:_id")
  async deleteSpace(session:WebSessionDoc,_id:ObjectId) {
    const user = WebSession.getUser(session);
    await Space.isAuthor(user,_id);
    return await Space.delete(_id);
  }
  //CHECK idk if it is patch or post 
  //doesnt work (prob because of my weird array hack) TODO 
  @Router.post("/spaces/:name/join")
  async joinSpace(session:WebSessionDoc,name:string) {
    const _id = (await Space.getSpaceBySpacename(name))._id;
    const user = WebSession.getUser(session);
    await Space.isNotInSpace( _id,user, "user");
    const added = await Space.addItem(_id, user, "user");
    return { msg: added.msg, space: added.space };

  }
  @Router.delete("/spaces/:name/leave")
  async leaveSpace(session:WebSessionDoc,name:string) {
    const _id = (await Space.getSpaceBySpacename(name))._id;
    const user = WebSession.getUser(session);
    await Space.isMember(user, _id);
    const added = await Space.deleteItem(_id, user, "user");
    return { msg: added.msg, space: added.space };

    
  }
  @Router.post("/spaces/:_id/addItem")
  async addSpaceItem(session:WebSessionDoc,_id:ObjectId, item_id:ObjectId, item_type:string) {
    
    const user = WebSession.getUser(session);
    await Space.isMember(user, _id);
    const added = await Space.addItem(_id, item_id, item_type);
    return { msg: added.msg, space: added.space };

  }
  @Router.delete("/spaces/:_id/deleteItem")
  async deleteSpaceItem(session:WebSessionDoc,_id:ObjectId, item_id:ObjectId, item_type:string) {
    
    const user = WebSession.getUser(session);
    await Space.isMember(user, _id);
    const maybePost = await Post.getById(item_id);
    //posts should only be removed by 
    if (maybePost.length === 1){
      const isAuthor = (Post.isAuthor(user, item_id) || Space.isAuthor(user,_id));
      if(!isAuthor){
        throw new NotAllowedError('Not the author of post or of the space');
      }
    }
    const added = await Space.deleteItem(_id, item_id, item_type);
    return { msg: added.msg, space: added.space };
  }

  //comment routes 
  @Router.post("/comments")
  async createComment(session: WebSessionDoc, content_id:ObjectId, target_id: ObjectId) {
    const user = WebSession.getUser(session);
    
    const created = await Comment.create(user, content_id, target_id);
    return { msg: created.msg, comment: created.comment };

  }
  
  @Router.get("/comments")
  async getComment(author?: string, target?:ObjectId) {
    
    if (author) {
      const id = (await User.getUserByUsername(author))._id;
      return await Comment.getByAuthor(id);
    }else if (target){
      return await Comment.getByTarget(target); 
    } else {
      return await Comment.getComments({});
    }
  }
  
  @Router.patch("/comments/:_id")
  async updateComment(session: WebSessionDoc, _id: ObjectId, update: Partial<CommentDoc>) {
    const user = WebSession.getUser(session);
    await Comment.isAuthor(user, _id);
    return await Comment.update(_id, update);
  }
  //how to delete posts from posts and groups can I just call the group router in posts
  @Router.delete("/comments/:_id")
  async deleteComment(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Comment.isAuthor(user, _id);
    return Comment.delete(_id);
  }
  

    // @Router.post("/collages/:flair")
    // async addToCollage(session: WebSessionDoc,name:string, flair:FlairType) {
    //   if(!Object.keys(FlairType).includes(flair.toString())){
    //     throw new InvalidPostFlairError(flair.toString(),Object.keys(FlairType));
    //   }
    //   const user = WebSession.getUser(session);
      
    //   const created = await Collage.create(user,name, flair, [],[]);
    //   return { msg: created.msg, collage: await created.collage };
  
    //   }
    
  
    // if (upload.media){
    //   const created = await Post.create(user, upload.media._id, flair);
    //   return { msg: created.msg, post: await Responses.post(created.post) };

    // }else{
    //   throw new MediaUploadFailureError(user,content);
    // }
    
  
  // @Router.post("/media/image")
  // async uploadImage(session: WebSessionDoc, content: string) {
  //   const user = WebSession.getUser(session);
  //   const created = await ImageMedia.upload(user, content);
  //   return { msg: created.msg, media: await created.media };
  // }
  // @Router.post("/media/")
  // async uploadVideo(session: WebSessionDoc, content: string) {
  //   const user = WebSession.getUser(session);
  //   const created = await ImageMedia.upload(user, content);
  //   return { msg: created.msg, media: await created.media };
  // }

 
  // @Router.get("/friends/")
  // async getFriends(session: WebSessionDoc) {
  //   const user = WebSession.getUser(session);
  //   return await User.idsToUsernames(await Friend.getFriends(user));
  // }

  
  // @Router.get("/invites")
  // async getInvitations(session: WebSessionDoc) {
  // }
  // @Router.post("/invites/:to")
  // async sendInvites(session: WebSessionDoc, to: string) {
    
  // }
  // // @Router.delete("/favorites/:favorite")
  // // async removeFavorite(session: WebSessionDoc, favorite: string) {
  
  // // }
  
  // @Router.get("/collages")
  // async getCollages(author?:String) {
    
  // }
  // @Router.get("/comments")
  // async getComments(author?:String) {
    
  // }
  // @Router.get("/profiles")
  // async getProfiles(author?:String) {
    
  // }
  // @Router.get("/spaces")
  // async getSpaces(author?:String) {
    
  // }
  // @Router.get("/messages")
  // async getMessages(author?:String) {
    
  // }
  // @Router.get("/swipestack")
  // async getSwipeStack(author?:String) {
    
  // }
  // @Router.get("/flair")
  // async getFlair(author?:String) {
    
  // }
  // @Router.delete("/friends/:friend")
  // async removeFriend(session: WebSessionDoc, friend: string) {
  //   const user = WebSession.getUser(session);
  //   const friendId = (await User.getUserByUsername(friend))._id;
  //   return await Friend.removeFriend(user, friendId);
  // }

  // @Router.get("/friend/requests")
  // async getRequests(session: WebSessionDoc) {
  //   const user = WebSession.getUser(session);
  //   return await Responses.friendRequests(await Friend.getRequests(user));
  // }

  // @Router.post("/friend/requests/:to")
  // async sendFriendRequest(session: WebSessionDoc, to: string) {
  //   const user = WebSession.getUser(session);
  //   const toId = (await User.getUserByUsername(to))._id;
  //   return await Friend.sendRequest(user, toId);
  // }

  // @Router.delete("/friend/requests/:to")
  // async removeFriendRequest(session: WebSessionDoc, to: string) {
  //   const user = WebSession.getUser(session);
  //   const toId = (await User.getUserByUsername(to))._id;
  //   return await Friend.removeRequest(user, toId);
  // }

  // @Router.put("/friend/accept/:from")
  // async acceptFriendRequest(session: WebSessionDoc, from: string) {
  //   const user = WebSession.getUser(session);
  //   const fromId = (await User.getUserByUsername(from))._id;
  //   return await Friend.acceptRequest(fromId, user);
  // }

  // @Router.put("/friend/reject/:from")
  // async rejectFriendRequest(session: WebSessionDoc, from: string) {
  //   const user = WebSession.getUser(session);
  //   const fromId = (await User.getUserByUsername(from))._id;
  //   return await Friend.rejectRequest(fromId, user);
  // }
}

export default getExpressRouter(new Routes());
