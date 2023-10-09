import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";
//not sure if i should combine message and invitation or make messages just posts idk 
//ma
export interface MemberDoc extends BaseDoc {
  user1: ObjectId;
  user2: ObjectId;
  object?: ObjectId;
}

export interface InvitationDoc extends BaseDoc {
  from: ObjectId;
  to: ObjectId;
  object?: ObjectId;
  status: "pending" | "rejected" | "accepted";
}

export default class InvitationConcept {
  public readonly members = new DocCollection<MemberDoc>("members");
  public readonly invitations = new DocCollection<InvitationDoc>("invitations");

  async getInvitations(user: ObjectId) {
    return await this.invitations.readMany({
      $or: [{ from: user }, { to: user }],
    });
  }

  async sendInvitation(from: ObjectId, to: ObjectId, object?:ObjectId) {
    await this.canSendInvitation(from, to,object);
    await this.invitations.createOne({ from, to, object, status: "pending" });
    return { msg: "Sent invitation!" };
  }

  async acceptInvitation(from: ObjectId, to: ObjectId) {
    await this.removePendingInvitation(from, to);
    // Following two can be done in parallel, thus we use `void`
    void this.invitations.createOne({ from, to, status: "accepted" });
    void this.addFriend(from, to);
    return { msg: "Accepted invitation!" };
  }

  async rejectInvitation(from: ObjectId, to: ObjectId) {
    await this.removePendingInvitation(from, to);
    await this.invitations.createOne({ from, to, status: "rejected" });
    return { msg: "Rejected invitation!" };
  }

  async removeInvitation(from: ObjectId, to: ObjectId) {
    await this.removePendingInvitation(from, to);
    return { msg: "Removed invitation!" };
  }

  async removeMember(user: ObjectId, friend: ObjectId, object?:ObjectId) {
    const membership = await this.members.popOne({
      $or: [
        { user1: user, user2: friend ,object},
        { user1: friend, user2: user ,object},
      ],
    });
    if (membership === null) {
      throw new MembershipNotFoundError(user, friend);
    }
    return { msg: "Unfriended!" };
  }

  async getMembers(user: ObjectId) {
    const memberships = await this.members.readMany({
      $or: [{ user1: user }, { user2: user }],
    });
    // Making sure to compare ObjectId using toString()
    return memberships.map((membership) => (membership.user1.toString() === user.toString() ? membership.user2 : membership.user1));
  }

  private async addFriend(user1: ObjectId, user2: ObjectId) {
    void this.members.createOne({ user1, user2 });
  }

  private async removePendingInvitation(from: ObjectId, to: ObjectId) {
    const invitation = await this.invitations.popOne({ from, to, status: "pending" });
    if (invitation === null) {
      throw new InvitationNotFoundError(from, to);
    }
    return invitation;
  }

  private async isNotFriends(u1: ObjectId, u2: ObjectId,object?:ObjectId) {
    const membership = await this.members.readOne({
      $or: [
        { user1: u1, user2: u2 ,object:object},
        { user1: u2, user2: u1 ,object:object},
      ],
    });
    if (membership !== null || u1.toString() === u2.toString()) {
      throw new AlreadyMemberError(u1, u2,object);
    }
  }

  private async canSendInvitation(u1: ObjectId, u2: ObjectId, object?:ObjectId) {
    await this.isNotFriends(u1, u2);
    // check if there is pending invitation between these users
    const invitation = await this.invitations.readOne({
      from: { $in: [u1, u2] },
      to: { $in: [u1, u2] },
      status: "pending",
    });
    if (invitation !== null) {
      throw new InvitationAlreadyExistsError(u1, u2);
    }
  }
}

export class InvitationNotFoundError extends NotFoundError {
  constructor(
    public readonly from: ObjectId,
    public readonly to: ObjectId,
  ) {
    super("Invitation from {0} to {1} does not exist!", from, to);
  }
}

export class InvitationAlreadyExistsError extends NotAllowedError {
  constructor(
    public readonly from: ObjectId,
    public readonly to: ObjectId,
  ) {
    super("Invitation between {0} and {1} already exists!", from, to);
  }
}

export class MembershipNotFoundError extends NotFoundError {
  constructor(
    public readonly user1: ObjectId,
    public readonly user2: ObjectId,
    object?:ObjectId,
  ) {
    super("{0} and {1} not in {2}!", user1, user2,object);
  }
}

export class AlreadyMemberError extends NotAllowedError {
  constructor(
    public readonly user1: ObjectId,
    public readonly user2: ObjectId,
    object?:ObjectId,
  ) {
    super("{0} and {1} are already members of {2}!", user1, user2,object);
  }
}
