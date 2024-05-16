// announcement.controller.js
const { convertDate } = require("../helpers/handlebars");
const Announcement = require("../models/announcement.model");
const AnnouncementRepository = require('../repositories/AnnouncementRepository');
const Account = require("../models/account.model"); // TODO

const {
  mutipleMongooseToObject,
  mongooseToObject,
} = require("../utils/mongoose");

class announceController {
  // [GET] announcement
  getNewAnnouncement = (req, res, next) => {
    try {
      res.render("admin_announcement");
    } catch (err) {
      next(err);
    }
  };

  // [POST] announcement/post
  postNewAnnouncement = async (req, res, next) => {
    try {
      const { title, content, recipient } = req.body;
      await AnnouncementRepository.create({ title, recipient, content });
      res.redirect("/announcement/all");
    } catch (err) {
      next(err);
    }
  };

  // [GET] announcement/all
  getAllAnnouncement = async (req, res, next) => {
    try {
      const page = isNaN(req.query.page) ? 1 : Math.max(1, parseInt(req.query.page));
      const limit = 10;
      const { announcements, total } = await AnnouncementRepository.findAllPaginated({ page, limit });

      res.render("admin_all_announcement", {
        convertDate: convertDate,
        announcements: mutipleMongooseToObject(announcements),
        _numberOfItems: total,
        _limit: limit,
        _currentPage: page
      });
    } catch (err) {
      next(err);
    }
  };

  // [GET] /announcement/list
  // getListAnnouncement = async (req, res, next) => {
  //   try {
  //     if (req.user) {
  //       const announcements = await AnnouncementRepository.findForUser({ user: req.user });
  //       res.json({ announcements });
  //     } else {
  //       res.json({});
  //     }
  //   } catch (err) {
  //     next(err);
  //   }
  // };

  getListAnnouncement = async (req, res, next) => {
    try {
      if (req.user) {
        // console.log("User is authenticated, fetching announcements for user with role:", req.user.role);

        const announcements = await Announcement.find({
          $or: [{ recipient: "Everyone" }, { recipient: `${req.user.role}s` }],
        }).sort({ time: -1 });

        // console.log(`Found ${announcements.length} announcements for user.`);

        // Ensure the readAnnounce array matches the number of announcements
        // Reset the array to 'true' for all to mark as unread by default
        if (req.session.readAnnounce.length !== announcements.length) {
          // console.log("Adjusting readAnnounce array size...");
          // Fill with 'true' up to the number of announcements
          req.session.readAnnounce = new Array(announcements.length).fill(true);
          console.log(`Initialized readAnnounce array to all true with length: ${req.session.readAnnounce.length}`);
        }

        // const readArr = req.session.readAnnounce;

        // Fetch the current user to access their readAnnounce array
        const user = await Account.findById(req.user._id).select('readAnnounce');
        let readArr = user.readAnnounce;

        // Ensure readAnnounce array covers all announcements, assuming all are unread if not covered
        if (readArr.length < announcements.length) {
          // Extend the readArr to match the number of announcements, default to false (unread)
          readArr = [...readArr, ...Array(announcements.length - readArr.length).fill(false)];
        }

        // If the readArr is longer than announcements (e.g., due to deletion of announcements), trim it
        readArr = readArr.slice(0, announcements.length);

        // console.log(readArr)
        // console.log("Sending announcements and read status to client.");
        res.json({ announcements, readArr });
      } else {
        // console.log("User is not authenticated. Returning empty response.");
        res.json({});
      }
    } catch (err) {
      console.error("Error in getListAnnouncement:", err);
      next(err);
    }
  };

  // getListAnnouncement = async (req, res, next) => {
  //   try {
  //     // console.log("Checking if user is authenticated...");
  //     if (req.user) {
  //       // console.log("User is authenticated, fetching announcements for user with role:", req.user.role);

  //       const announcements = await Announcement.find({
  //         $or: [{ recipient: "Everyone" }, { recipient: `${req.user.role}s` }],
  //       }).sort({ time: -1 });

  //       // console.log(`Found ${announcements.length} announcements for user.`);

  //       // Check if the session readAnnounce array needs to be expanded
  //       if (req.session.readAnnounce.length < announcements.length) {
  //         // console.log("Adjusting readAnnounce array size...");
  //         const initialLength = req.session.readAnnounce.length;
  //         for (let i = 0; i < announcements.length - initialLength; i++) {
  //           req.session.readAnnounce.unshift(1);
  //         }
  //         // console.log(`Updated readAnnounce array from ${initialLength} to ${req.session.readAnnounce.length} elements.`);
  //       }

  //       const readArr = req.session.readAnnounce;
  //       // console.log("Sending announcements and read status to client.");
  //       res.json({ announcements, readArr });
  //     } else {
  //       console.log("User is not authenticated. Returning empty response.");
  //       res.json({});
  //     }
  //   } catch (err) {
  //     console.error("Error in getListAnnouncement:", err);
  //     next(err);
  //   }
  // };

  // getListAnnouncement = async (req, res, next) => {
  //   try {
  //     if (req.user) {
  //       const announcements = await Announcement.find({
  //         $or: [{ recipient: "Everyone" }, { recipient: req.user.role + "s" }],
  //       }).sort({ time: -1 });
  //       if (req.session.readAnnounce.length < announcements.length) {
  //         for (
  //           let i = 0;
  //           i < announcements.length - req.session.readAnnounce.length;
  //           i++
  //         ) {
  //           req.session.readAnnounce.unshift(1);
  //         }
  //       }
  //       const readArr = req.session.readAnnounce;
  //       res.json({ announcements, readArr });
  //     } else {
  //       res.json({});
  //     }
  //   } catch (err) {
  //     next(err);
  //   }
  // };

  // [POST] /announcement/list/:idx
  // The code updates the read status of announcements for a specific user in a database and returns the updated status. 
  // It's used in a web application to mark announcements as read for the logged-in user and then reflect this change in the user's session data.
  updateListAnnouncement = async (req, res, next) => {
    // console.log(req.params.idx);
    try {
      const userId = req.user._id; // make sure the user is authenticated and req.user is populated
      const idx = req.params.idx; // index of the announcement to update
      // console.log(userId, idx);

      // Fetch user data or announcement tracking data, update the read status
      // This is a simplified example. You would need to adjust it based on how your data is structured.
      await AnnouncementRepository.updateReadAnnouncements({
        userId: userId,
        idx: idx
      });

      // After updating the database, send back the updated read status array or confirmation
      const updatedReadArr = await AnnouncementRepository.getReadStatus(userId);
      res.json(updatedReadArr);
    } catch (error) {
      console.error('Failed to update announcement read status:', error);
      res.status(500).send('Server error');
    }
  }
  // updateListAnnouncement = async (req, res, next) => {
  //   console.log(req.params.idx);
  //   try {
  //     await AnnouncementRepository.updateReadAnnouncements({
  //       userId: req.user._id,
  //       readAnnounce: req.session.readAnnounce
  //     });
  //     res.json(req.session.readAnnounce);
  //   } catch (err) {
  //     next(err);
  //   }
  // };
}

module.exports = new announceController();
