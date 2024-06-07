// helpers/decisionHelper.js
// import User from "../models/users.model.js";
import Committee from "../models/committee.model.js"; 
import UserWorkflow from "../models/userWorkflow.model.js";
import Workflow from "../models/workflow.model.js";

export const aggregateVotes = (votes, stageIndex) => {
  const voteCounts = votes.reduce((counts, vote) => {
    if (vote.stageIndex === stageIndex) {
      counts[vote.decision] = (counts[vote.decision] || 0) + 1;
    }
    return counts;
  }, {});

  return voteCounts;
};

export const handleMajorityDecision = async (workflow, userId, majorityDecision, currentStageIndex, res) => {
  if (majorityDecision === 'forward') {
    if (currentStageIndex < workflow.assignedUsers.length - 1) {
      workflow.currentStageIndex += 1;
      await UserWorkflow.updateOne(
        { userId, "workflows.workflowId": workflow._id },
        { $set: { "workflows.$.isActive": false } }
      );

      const nextAssignedUser = workflow.assignedUsers[workflow.currentStageIndex];
      const nextUserId = nextAssignedUser.user || nextAssignedUser.committee;

      await UserWorkflow.updateOne(
        { userId: nextUserId, "workflows.workflowId": workflow._id },
        { $set: { "workflows.$.isActive": true } }
      );

      if (nextAssignedUser.userType === 'Committee') {
        const nextCommittee = await Committee.findById(nextUserId).populate('members');
        for (const member of nextCommittee.members) {
          await sendNotification(member._id, userId, `Workflow ${workflow.workflowName} has reached your stage as part of the committee ${nextCommittee.name}.`, workflow._id);
        }
        await sendNotification(nextCommittee.chairperson, userId, `Workflow ${workflow.workflowName} has reached your stage as the chairperson of committee ${nextCommittee.name}.`, workflow._id);
      } else {
        await sendNotification(nextUserId, userId, `Workflow ${workflow.workflowName} has reached your stage.`, workflow._id);
      }
    }
  } else if (majorityDecision === 'revert') {
    if (currentStageIndex > 0) {
      workflow.currentStageIndex -= 1;
      await UserWorkflow.updateOne(
        { userId, "workflows.workflowId": workflow._id },
        { $set: { "workflows.$.isActive": false } }
      );

      const prevAssignedUser = workflow.assignedUsers[workflow.currentStageIndex];
      const prevUserId = prevAssignedUser.user || prevAssignedUser.committee;

      await UserWorkflow.updateOne(
        { userId: prevUserId, "workflows.workflowId": workflow._id },
        { $set: { "workflows.$.isActive": true } }
      );

      if (prevAssignedUser.userType === 'Committee') {
        const prevCommittee = await Committee.findById(prevUserId).populate('members');
        for (const member of prevCommittee.members) {
          await sendNotification(member._id, userId, `Workflow ${workflow.workflowName} was reverted back to your stage as part of the committee ${prevCommittee.name}.`, workflow._id);
        }
        await sendNotification(prevCommittee.chairperson, userId, `Workflow ${workflow.workflowName} was reverted back to your stage as the chairperson of committee ${prevCommittee.name}.`, workflow._id);
      } else {
        await sendNotification(prevUserId, userId, `Workflow ${workflow.workflowName} was reverted back to your stage.`, workflow._id);
      }
    }
  } else if (majorityDecision === 'approve') {
    workflow.status = 'Approved';
    await sendNotification(workflow.user, userId, `Workflow ${workflow.workflowName} was approved.`, workflow._id);
  } else if (majorityDecision === 'reject') {
    workflow.status = 'Rejected';
    await sendNotification(workflow.user, userId, `Workflow ${workflow.workflowName} was rejected.`, workflow._id);
  }

  await workflow.save();
  return res.status(200).json({ workflow });
};
