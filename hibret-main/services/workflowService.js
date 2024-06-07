import User from "../models/users.model.js";
import UserWorkflow from "../models/userWorkflow.model.js";

export function getCurrentQuarter() {
  const month = new Date().getMonth() + 1; // getMonth() returns 0-11
  return Math.floor((month - 1) / 3) + 1;
}

// Helper function to assign user to a stage with condition
export async function assignUserWithCondition(stage, documentData) {
  // Extract the condition field and its value from the stage
  console.log(documentData);
  const conditionFieldName = stage.condition;
  console.log(conditionFieldName);
  const conditionValue = extractConditionValue(
    conditionFieldName,
    documentData
  );
  console.log(conditionValue);

  // Initialize an array to store potential users for approval
  let potentialApprovers = [];

  // Check if the stage has condition variants
  if (stage.conditionVariants && stage.conditionVariants.length > 0) {
    // Iterate over each condition variant
    for (const variant of stage.conditionVariants) {
      // Evaluate the condition variant
      const conditionMatched = evaluateCondition(variant, conditionValue);
      console.log(conditionMatched);
      // If the condition variant is matched
      if (conditionMatched) {
        // Select approver(s) based on the condition variant
        if (variant.approverType === "Single Person") {
          console.log("SingleWithCondition");
          console.log(variant.single_permissions.role_id);
          // Select single user based on role and workload
          potentialApprovers = await selectSingleUser(
            variant.single_permissions.role_id
          );
        } else if (variant.approverType === "Committee") {
          console.log("ComitteeWithCondition");
          // Select committee members based on roles and workload
          // potentialApprovers = await selectCommitteeMembers(variant.committee_permissions.role_ids);
          potentialApprovers = variant.committee_permissions.role_ids;
        }
        // Break the loop after finding the matched condition variant
        break;
      }
    }
  }

  // Return the selected user(s)
  return potentialApprovers;
}

// Function to extract condition value from document data
function extractConditionValue(fieldName, documentData) {
  console.log("documentData:", JSON.stringify(documentData, null, 2)); // Log the structure of documentData

  // Iterate through documentData to find the field matching fieldName and return its value
  for (const data of documentData) {
    console.log("Processing data:", JSON.stringify(data, null, 2)); // Log the current data object

    if (data.sections && Array.isArray(data.sections)) {
      // Check if data.sections is defined and is an array
      for (const section of data.sections) {
        console.log("Processing section:", JSON.stringify(section, null, 2)); // Log the current section object

        if (section.content && Array.isArray(section.content)) {
          // Check if section.content is defined and is an array
          // Find the content with the given fieldName
          const content = section.content.find(
            (field) => field.title === fieldName
          );
          if (content && content.value !== undefined) {
            // If content is found, return its value
            return content.value;
          }
        }
      }
    } else {
      console.log(
        "data.sections is not an array or is undefined for data:",
        JSON.stringify(data, null, 2)
      );
    }
  }
  // If no matching field is found, return undefined or a default value
  return undefined;
}

// Function to evaluate condition variant
function evaluateCondition(variant, conditionValue) {
  // Logic to evaluate condition based on condition value and variant value
  // For example, you might compare the condition value with the variant value using the operator
  switch (variant.operator) {
    case ">":
      return conditionValue > variant.value;
    case "<":
      return conditionValue < variant.value;
    case ">=":
      return conditionValue >= variant.value;
    case "<=":
      return conditionValue <= variant.value;
    default:
      return false;
  }
}

// Function to select single user based on role and workload
export async function selectSingleUser(role_id) {
  try {
    // Find users with the given role_id
    const users = await User.find({ role_id });

    // Array to store workload details of each user
    const workloadDetails = [];

    // Iterate through users
    for (const user of users) {
      // Find the user's entry in the UserWorkflow collection
      const userWorkflow = await UserWorkflow.findOne({ userId: user._id });

      // If userWorkflow is found, count the number of workflows
      let workflowCount = 0;
      if (userWorkflow) {
        workflowCount = userWorkflow.workflows.length;
      }

      // Push workload details to array
      workloadDetails.push({ userId: user._id, workflowCount });
    }

    // Sort users based on workload (ascending order)
    workloadDetails.sort((a, b) => a.workflowCount - b.workflowCount);

    // Return the user ID with the least workload
    console.log("the user with least workload");
    console.log(workloadDetails[0].userId);
    return workloadDetails[0].userId;
  } catch (error) {
    console.error("Error finding user with least workload:", error);
    throw error; // Throw error for handling at higher level
  }
}

// Function to select committee members based on roles and workload
async function selectCommitteeMembers(roleIds) {
  // Query UserWorkflow collection to find committee members with least workload for the specified roles
  // Logic to select committee members with least workload
  // Return the selected committee members
}

// Helper function to assign user to a stage without condition
export async function assignUserWithoutCondition(stage) {
  let potentialApprovers = [];
  if (stage.approverType === "Single Person") {
    console.log("signlewithoutcondition");
    console.log(stage.single_permissions.role_id);
    // Select single user based on role and workload
    potentialApprovers = await selectSingleUser(
      stage.single_permissions.role_id
    );
  } else if (stage.approverType === "Committee") {
    console.log("committeeWithoutConditon");
    // Select committee members based on roles and workload
    // potentialApprovers = await selectCommitteeMembers(stage.committee_permissions.role_ids);
    potentialApprovers = stage.committee_permissions.role_ids;
  }
  return potentialApprovers;
}


export function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

  let keys1 = Object.keys(obj1);
  let keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;

  for (let key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}
