import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface FavoriteDoc extends BaseDoc {
  sender: ObjectId;
  receiver: ObjectId;
}


export default class FavoriteConcept {
  public readonly favorites = new DocCollection<FavoriteDoc>("favorites");
  //public readonly requests = new DocCollection<FriendRequestDoc>("friendRequests");

  async removeFavorite(sender: ObjectId, receiver: ObjectId) {
    const favorite = await this.favorites.popOne(
        { sender: sender, receiver: receiver });
    if (favorite === null) {
      throw new FavoriteNotFoundError(sender, receiver);
    }
    return { msg: "Unfavorited!" };
  }

  async getFavorites(item: ObjectId) {
    const favorites = await this.favorites.readMany(
      { receiver: item });
    // Making sure to compare ObjectId using toString()
    //lowkey could remove ternary but o well 
    return favorites.map((favorite) => (favorite.sender.toString() === item.toString() ? favorite.receiver : favorite.sender));
  }

  private async addFavorite(sender: ObjectId, receiver: ObjectId) {
    void this.favorites.createOne({ sender, receiver });
  }

  

  private async isNotFavorited(sender: ObjectId, reciever: ObjectId) {
    const favorite = await this.favorites.readOne(

        { sender: sender, receiver: reciever }
    );
    if (favorite !== null || sender.toString() === reciever.toString()) {
      throw new AlreadyFavoritedError(sender, reciever);
    }
  }
}
  

//sender: User Reciever:a Post (Use Case)
export class FavoriteNotFoundError extends NotFoundError {
  constructor(
    public readonly sender: ObjectId,
    public readonly receiver: ObjectId,
  ) {
    super("Favorite sent by {0} to {1} does not exist!", sender, receiver);
  }
}

export class AlreadyFavoritedError extends NotAllowedError {
  constructor(
    public readonly sender: ObjectId,
    public readonly receiver: ObjectId,
  ) {
    super("{0} has already favorited {1}!", sender, receiver);
  }
}
