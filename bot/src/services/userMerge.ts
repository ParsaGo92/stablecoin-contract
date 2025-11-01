import { CheckModel, InvoiceModel, SubscriptionHistoryModel, UserDocument, UserModel } from '../models';

function mergeSubscription(
  current: UserDocument['subscription'],
  incoming: UserDocument['subscription']
): UserDocument['subscription'] {
  const candidates = [current, incoming]
    .map((entry) => (entry?.active && entry.expiresAt ? new Date(entry.expiresAt) : null))
    .filter((value): value is Date => value !== null);

  if (!candidates.length) {
    return { active: false };
  }

  const latest = candidates.reduce((max, value) => (value.getTime() > max.getTime() ? value : max));

  if (latest.getTime() <= Date.now()) {
    return { active: false };
  }

  return { active: true, expiresAt: latest };
}

export async function mergeUserAccounts(target: UserDocument, source: UserDocument): Promise<UserDocument> {
  if (target._id.toString() === source._id.toString()) {
    return target;
  }

  await InvoiceModel.updateMany({ userId: source._id }, { $set: { userId: target._id } });
  await SubscriptionHistoryModel.updateMany({ userId: source._id }, { $set: { userId: target._id } });
  await CheckModel.updateMany({ userId: source._id }, { $set: { userId: target._id } });

  target.balanceUsd += source.balanceUsd;
  target.subscription = mergeSubscription(target.subscription, source.subscription);
  target.lang = source.lang ?? target.lang;
  target.secretKeyHash = source.secretKeyHash;
  if (source.secretKeyIssuedAt) {
    target.secretKeyIssuedAt = source.secretKeyIssuedAt;
  }

  await target.save();
  await UserModel.deleteOne({ _id: source._id });

  const updated = await UserModel.findById(target._id);
  return updated ?? target;
}
