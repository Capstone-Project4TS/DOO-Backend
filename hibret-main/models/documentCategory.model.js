import mongoose from 'mongoose';
const categorySchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, required: true, auto: true },
    name: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
});
  
  const Category = mongoose.model('Category', categorySchema);
  export default  Category;