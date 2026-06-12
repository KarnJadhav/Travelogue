const fs = require("fs");
const { cloudinary, assertCloudinaryConfig } = require("../config/cloudinary");

function safeRemoveLocalFile(filePath) {
  if (!filePath) return Promise.resolve();
  return fs.promises.unlink(filePath).catch(() => {});
}

async function uploadLocalFile(filePath, options = {}) {
  assertCloudinaryConfig();

  const uploadOptions = {
    resource_type: "auto",
    ...options
  };

  return cloudinary.uploader.upload(filePath, uploadOptions);
}

async function uploadAndCleanupLocalFile(filePath, options = {}) {
  try {
    return await uploadLocalFile(filePath, options);
  } finally {
    await safeRemoveLocalFile(filePath);
  }
}

async function destroyAsset(publicId, options = {}) {
  if (!publicId) return null;
  assertCloudinaryConfig();

  const destroyOptions = {
    resource_type: "image",
    invalidate: true,
    ...options
  };

  return cloudinary.uploader.destroy(publicId, destroyOptions);
}

module.exports = {
  safeRemoveLocalFile,
  uploadLocalFile,
  uploadAndCleanupLocalFile,
  destroyAsset
};
