import { Schema, model } from 'mongoose';

// MongoDB schema and model
const mediaSchema = new Schema({
  url: { type: String, required: true },
  tempId: {
    type: Schema.Types.ObjectId,
    ref: "DocumentTemplate",
    required: true
  }
});

const Media = model('Media', mediaSchema);

export default Media;
