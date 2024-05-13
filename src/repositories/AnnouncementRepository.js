// AnnouncementRepository.js
const Announcement = require('../models/announcement.model');
const Account = require("../models/account.model");

class AnnouncementRepository {
    async create({ title, recipient, content }) {
        const announcement = new Announcement({ title, recipient, content });
        return announcement.save();
    }

    async findAllPaginated({ page, limit }) {
        const skip = (page - 1) * limit;
        const announcements = await Announcement.find().sort({ time: -1 }).skip(skip).limit(limit);
        const total = await Announcement.countDocuments();
        return { announcements, total };
    }

    async findForUser({ user, limit }) {
        const announcements = await Announcement.find({
            $or: [{ recipient: "Everyone" }, { recipient: `${user.role}s` }]
        }).sort({ time: -1 });
        return announcements;
    }

    async updateReadAnnouncements({ userId, idx }) {
        // console.log("Updating read announcements for:", userId, "at index:", idx);

        // const currentUser = await Account.findById(userId).select('readAnnounce');
        // console.log("Current state of readAnnounce:", currentUser.readAnnounce);

        // Prepare the update statement to mark the specified index as read (false)
        const update = { $set: { [`readAnnounce.${idx}`]: false } };

        // Perform the update operation
        const result = await Account.updateOne({ _id: userId }, update);

        // Log the result of the update to see what was affected
        // console.log("Update result:", result);

        return result;
    }
    // async updateReadAnnouncements({ userId, readAnnounce }) {
    //     return Account.updateOne({ _id: userId }, { readAnnounce });
    // }

    async getReadStatus(userId) {
        // Assuming that the read statuses are stored in the Account model
        // under a field like `readAnnounce`, which could be an array or another structure.
        const account = await Account.findById(userId).select('readAnnounce');
        // This will return the `readAnnounce` field from the Account document.
        // You need to ensure the data structure of `readAnnounce` meets your needs.
        return account ? account.readAnnounce : null;
    }
}

module.exports = new AnnouncementRepository();
