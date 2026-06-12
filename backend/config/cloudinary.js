const { v2: cloudinary } = require("cloudinary");

function hasCloudinaryCredentials() {
  if (process.env.CLOUDINARY_URL) return true;

  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

if (hasCloudinaryCredentials()) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({
      secure: true
    });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
  }
}

function assertCloudinaryConfig() {
  if (hasCloudinaryCredentials()) return;

  throw new Error(
    "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) in backend/.env"
  );
}

module.exports = {
  cloudinary,
  assertCloudinaryConfig
};
