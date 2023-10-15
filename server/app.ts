import CollageConcept from "./concepts/collage";
import CommentConcept from "./concepts/comment";
import FavoriteConcept from "./concepts/favorite";
import FriendConcept from "./concepts/friend";
import MediaConcept from "./concepts/media";
import PostConcept from "./concepts/post";
import SpaceConcept from "./concepts/space";
import UserConcept from "./concepts/user";
import WebSessionConcept from "./concepts/websession";

// App Definition using concepts
export const WebSession = new WebSessionConcept();
export const User = new UserConcept();
export const Post = new PostConcept();
export const Friend = new FriendConcept();
export const Media = new MediaConcept("media");
export const Space = new SpaceConcept();
export const Comment = new CommentConcept();
export const Collage = new CollageConcept();
export const CollageFavorite = new FavoriteConcept("collage");
export const PostFavorite = new FavoriteConcept("post");
export const UserFavorite = new FavoriteConcept("user");
export const SpaceFavorite = new FavoriteConcept("space");


