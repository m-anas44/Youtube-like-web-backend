import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uplaodOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // uploading file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // uploaded file successfully
    console.log("File has been uploaded", response.url);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); //remove the local uploaded file on failed uploading
    return null;
  }
};

export { uplaodOnCloudinary };
