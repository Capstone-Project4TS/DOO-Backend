// models/Department.js
import mongoose from "mongoose";

const DepartmentSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true, auto: true },

  name: {
    type: String,
    required: true,
  },
  // other fields...
});

const Department = mongoose.model("Department", DepartmentSchema);
export default Department;
