import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface FavoriteDoc extends BaseDoc {
  sender: ObjectId;
  receiver: ObjectId;
}


export default class FavoriteConcept {
  public readonly favorites:DocCollection<FavoriteDoc>;
  constructor(name: string){
    this.favorites = new DocCollection<FavoriteDoc>(name);
}
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
    return favorites.map((favorite) => (favorite.sender.toString() === item.toString() ? favorite.receiver : favorite.sender));
  }

  async addFavorite(sender: ObjectId, receiver: ObjectId) {
    await this.isNotFavorited(sender, receiver);
    const _id = await this.favorites.createOne({ sender, receiver });
    return { msg: "Favorite successfully created!", favorite: await this.favorites.readOne({_id}) };
  }
  async isFavorited(sender: ObjectId, reciever: ObjectId) {
    const favorite = await this.favorites.readOne(
        { sender: sender, receiver: reciever }
    );
    if (!favorite) {
        throw new NotFoundError(`${sender} hasn't favorited ${reciever}!`);
      }
      if (favorite.sender.toString() !== sender.toString()) {
        throw new FavoriteSenderNotMatchError(sender, reciever);
    }
    if (favorite !== null || sender.toString() === reciever.toString()) {
      throw new AlreadyFavoritedError(sender, reciever);
    }
  }

  
  private async isNotFavorited(sender: ObjectId, reciever: ObjectId) {
    const favorite = await this.favorites.readOne(

        { sender: sender, receiver: reciever }
    );
    console.log(`sender is ${sender} and reciever is ${reciever}and${favorite!== null}`)
    if (favorite !== null){
        if (sender.toString() === reciever.toString()) {
            throw new AlreadyFavoritedError(sender, reciever);
        }
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
//?? IDK what would ever trigger this do I need it 
export class FavoriteSenderNotMatchError extends NotAllowedError {
    constructor(
      public readonly sender: ObjectId,
      public readonly reciever: ObjectId,
    ) {
      super("{0} is not the favoriter of {1}!", sender, reciever);
    }
  }
  