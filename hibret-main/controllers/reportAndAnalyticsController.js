import User from '../models/users.model.js';
import Document from '../models/document.model.js';
import Workflow from '../models/workflow.model.js';
// import PermissionChange from '../models/permissionChangeModel';

// GET: http://localhost:5000/admin/reports/system-activity
export async function getSystemActivityDashboard(req, res) {
  try {
    const activeUsers = await User.aggregate([
      {
        $match: { status: "Active" },
      },
      {
        $group: {
          _id: { month: { $month: "$lastLoginDate" }, year: { $year: "$lastLoginDate" } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    const documentCreation = await Document.aggregate([
      {
        $group: {
          _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    const workflowInitiation = await Workflow.aggregate([
      {
        $group: {
          _id: "$workflowTemplate",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "workflowtemplates",
          localField: "_id",
          foreignField: "_id",
          as: "template",
        },
      },
      {
        $unwind: "$template",
      },
    ]);

    // const permissionsChanges = await PermissionChange.aggregate([
    //   {
    //     $group: {
    //       _id: "$type",
    //       count: { $sum: 1 },
    //     },
    //   },
    // ]);

    const response = {
      activeUsers: activeUsers.map(item => ({
        month: `${item._id.year}-${item._id.month}`,
        count: item.count,
      })),
      documentCreation: documentCreation.map(item => ({
        month: `${item._id.year}-${item._id.month}`,
        count: item.count,
      })),
      workflowInitiation: workflowInitiation.map(item => ({
        template: item.template.name,
        count: item.count,
      })),
    //   permissionsChanges: permissionsChanges.map(item => ({
    //     type: item._id,
    //     count: item.count,
    //   })),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching system activity dashboard:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export default{
    getSystemActivityDashboard
}