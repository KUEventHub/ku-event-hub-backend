import Jimp from "jimp";
import jsQR from "jsqr";

export async function checkQrcode(qrcodeString: string) {
  try {
    const base64Data = qrcodeString.replace("data:image/png;base64,", "");
    const buffer = Buffer.from(base64Data, "base64");
    const qrcodeImage = await Jimp.read(buffer);
    const qrcodeData = jsQR(
      new Uint8ClampedArray(qrcodeImage.bitmap.data),
      qrcodeImage.bitmap.width,
      qrcodeImage.bitmap.height
    );

    return qrcodeData ? qrcodeData.data : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}
