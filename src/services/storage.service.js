const ImageKit = require("imagekit");

const imagekit = new ImageKit({
  publicKey: process.env.IMAGE_KIT_PUBLICKEY || "public_lP44+6R0QiP5Oh/vB4asq77rWGI=",
  privateKey: process.env.IMAGE_KIT_PRIVATEKEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/upcohv2n9",
});

const uploadUserFile = async (fileBuffer, fileName, folder = "/vibely/profiles") => {
  try {
    const result = await imagekit.upload({
      file: fileBuffer,
      fileName: `${fileName}_${Date.now()}`,
      folder: folder,
    });

    console.log("Upload successful!");
    return result;
  } catch (err) {
    console.error("Upload failed:", err.message);
    throw err;
  }
};

module.exports = { uploadUserFile, imagekit };