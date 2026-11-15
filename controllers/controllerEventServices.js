const EventColRef = require("../models/modelEventService");
const VendorColRef = require("../models/modelVendor");

// 1. Fetch services according to selected event
async function doGiveServices(req, res) {
  try {
    const { eventOptions } = req.body || {};

    if (!eventOptions) {
      return res.status(400).json({
        status: false,
        msg: "Event name is required",
      });
    }

    const result = await EventColRef.findOne({
      event: eventOptions.trim(),
    }).lean();

    if (!result) {
      return res.status(404).json({
        status: false,
        msg: "Invalid event. Please seed the events first.",
      });
    }

    return res.json({
      status: true,
      msg: result.services,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      msg: error.message,
    });
  }
}

// 2. Fetch unique cities from vendors
async function doFetchCities(req, res) {
  try {
    const cities = await VendorColRef.distinct("city", {
      city: { $exists: true, $nin: ["", null] },
    });

    return res.json({
      status: true,
      msg: cities,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      msg: error.message,
    });
  }
}

// 3. Fetch vendors by city and selected services
async function doGiveVendorDetails(req, res) {
  try {
    const { city, services } = req.body || {};

    if (
      !city ||
      !services ||
      (Array.isArray(services) && services.length === 0)
    ) {
      return res.status(400).json({
        status: false,
        msg: "City and services are required",
      });
    }

    const servicesList = (
      Array.isArray(services) ? services : [services]
    ).filter((service) => typeof service === "string" && service.trim());

    if (servicesList.length === 0) {
      return res.status(400).json({
        status: false,
        msg: "Please select a valid service",
      });
    }

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const searchPattern = servicesList.map(escapeRegex).join("|");

    // IMPORTANT: "selcate" must match the field
    // name in your modelVendor.js schema.
    const result = await VendorColRef.find({
      city: { $regex: `^${escapeRegex(city.trim())}$`, $options: "i" },
      selcate: { $regex: searchPattern, $options: "i" },
    }).lean();

    return res.json({
      status: true,
      msg: result,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      msg: error.message,
    });
  }
}

module.exports = {
  doGiveServices,
  doFetchCities,
  doGiveVendorDetails,
};
