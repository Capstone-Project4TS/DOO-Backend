import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true, auto: true },
  name: {
    type: String,
    required: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  }
});

const SubCategory = mongoose.model("SubCategory", subCategorySchema);
export default SubCategory;
