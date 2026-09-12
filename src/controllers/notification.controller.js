import {
  getUserNotifications,
  markNotificationRead
} from "../services/notification.service.js";

export async function getNotificationsController(
  req,
  res
) {
  try {
    const notifications =
      await getUserNotifications(
        req.user._id
      );

    return res.json({
      success: true,
      notifications
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function markNotificationReadController(
  req,
  res
) {
  try {
    const notification =
      await markNotificationRead({
        userId: req.user._id,
        notificationId:
          req.params.notificationId
      });

    return res.json({
      success: true,
      notification
    });
  } catch (error) {
    const statusCode =
      error.message ===
      "Notification not found"
        ? 404
        : 400;

    return res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}