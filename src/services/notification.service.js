import { Notification } from "../models/Notification.js";

export async function createNotification({
  userId,
  companyId,
  type,
  title,
  message,
  triggerPrice = null,
  observedPrice = null,
  metadata = {}
}) {
  return Notification.create({
    userId,
    companyId,
    type,
    title,
    message,
    triggerPrice,
    observedPrice,
    metadata
  });
}

export async function getUserNotifications(
  userId
) {
  return Notification.find({
    userId
  })
    .populate(
      "companyId",
      "name isin listings"
    )
    .sort({
      createdAt: -1
    });
}

export async function markNotificationRead({
  userId,
  notificationId
}) {
  const notification =
    await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        userId
      },
      {
        $set: {
          isRead: true
        }
      },
      {
        new: true
      }
    );

  if (!notification) {
    throw new Error(
      "Notification not found"
    );
  }

  return notification;
}