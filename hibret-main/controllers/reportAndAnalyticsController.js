import User from '../models/users.model.js';
import Document from '../models/document.model.js';
import Workflow from '../models/workflow.model.js';
import WorkflowTemplate from '../models/workflowTemplate.model.js';
import DocumentTemplate from '../models/documentTemplate.model.js';
import UserWorkflow from '../models/userWorkflow.model.js'
import Role from '../models/role.model.js';
import Department from '../models/department.model.js';

export async function getAdminDashboard(req, res) {
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

    const workflowStatusCounts = await Workflow.aggregate([
      {
        $match: { status: { $in: ["Approved", "Rejected"] } },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          status: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

     // Count roles found in different departments
     const rolesByDepartment = await Role.aggregate([
      {
        $group: {
          _id: '$depId',
          rolesCount: { $sum: 1 } // Count the number of roles within each department
        }
      },
      {
        $lookup: {
          from: 'departments', // Collection name
          localField: '_id',
          foreignField: '_id',
          as: 'department'
        }
      },
      {
        $addFields: {
          departmentName: { $arrayElemAt: ['$department.name', 0] }
        }
      },
      {
        $project: {
          departmentName: { $arrayElemAt: ["$department.name", 0] }, // Extract department name from the department document
      rolesCount: 1 // Include the roles count
        }
      }
    ]);

    const workflowTemplateCount = await WorkflowTemplate.countDocuments({});
    const documentTemplateCount = await DocumentTemplate.countDocuments({});

    const response = {
      activeUsers: activeUsers.map(item => ({
        month: `${item._id.year}-${item._id.month}`,
        count: item.count,
      })),
      workflowStatusCounts: workflowStatusCounts.map(item => ({
        status: item.status,
        count: item.count,
      })),
      workflowTemplateCount,
      documentTemplateCount,
      rolesByDepartment,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching admin dashboard data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAdminReport(req, res) {
  try {
    const workflowTemplateUsage = await Workflow.aggregate([
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
      {
        $project: {
          templateName: "$template.name",
          count: 1,
        },
      },
    ]);

   // Aggregating document template usage
   const documentTemplateUsage = await Document.aggregate([
    {
      $group: {
        _id: "$templateId",
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "documenttemplates",
        localField: "_id",
        foreignField: "_id",
        as: "template",
      },
    },
    {
      $unwind: "$template",
    },
    {
      $project: {
        templateName: "$template.title",
        count: 1,
      },
    },
  ]);

    const workflowCreationTimeline = await Workflow.aggregate([
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

    const response = {
      workflowTemplateUsage: workflowTemplateUsage.map(item => ({
        template: item.templateName,
        count: item.count,
      })),
      documentTemplateUsage: documentTemplateUsage.map(item => ({
        template: item.templateName,
        count: item.count,
      })),
      workflowCreationTimeline: workflowCreationTimeline.map(item => ({
        month: `${item._id.year}-${item._id.month}`,
        count: item.count,
      })),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching admin report data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}


export async function getUserDashboard(req, res) {
  const userId = req.userId; // Assuming userId is available in the request

  try {
    // Count workflows initiated by the user
    const initiatedWorkflowsCount = await Workflow.countDocuments({ user: userId });

    // Count workflows assigned to the user
    const assignedWorkflowsCount = await UserWorkflow.countDocuments({
      userId,
      "workflows.isActive": true,
    });

    // Find all workflows assigned to the user
    const assignedWorkflows = await Workflow.find({ "assignedUsers.user": userId });

    // Count documents created by the user while creating workflows
    const documentIds = assignedWorkflows.reduce((acc, workflow) => {
      const requiredDocs = workflow.requiredDocuments.map(doc => doc.toString());
      const additionalDocs = workflow.additionalDocuments.map(doc => doc.toString());
      return [...acc, ...requiredDocs, ...additionalDocs];
    }, []);

    const createdDocumentsCount = await Document.countDocuments({ _id: { $in: documentIds } });

    const response = {
      initiatedWorkflowsCount,
      assignedWorkflowsCount: assignedWorkflows.length,
      createdDocumentsCount
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching user dashboard data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export default{
    getAdminReport,
    getAdminDashboard,
    getUserDashboard
}