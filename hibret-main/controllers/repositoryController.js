import Repository from "../models/repository.model.js";
import { getDeps } from "./roleController.js";

export async function createRepositories() {
    try {
      const Deps = await getDeps();
      if (Deps) {
        for (const dep of Deps) {
          const { name } = dep;
  
          // Check if repository exists
          const existingRepo = await Repository.findOne({ name });
  
          if (!existingRepo) {
            // Create new repository
            const newRepo =new Repository({
              name: name,
              categories: [], // Initialize with empty categories
            });
  
            await newRepo.save();
          }
        }
  
        return { message: "Repositories created or updated successfully" };
      }
    } catch (error) {
      console.error("Error occurred while creating repositories:", error);
      return { error: "Internal Server Error" };
    }
  }
  

// Function to handle the API request and response for creating repositories
export async function getRepos(req, res) {
    try {
        const result = await Repository.find();
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error creating repositories:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}


// Controller function to fetch repositories with folders and workflows
export const fetchRepositories = async (req, res) => {
    try {
        // Retrieve repositories from the database and populate categories, subcategories, folders, and workflows
        const repositories = await Repository.find().populate({
            path: 'categories',
            populate: {
                path: 'subcategories',
                populate: {
                    path: 'folders',
                    populate: {
                        path: 'workflows'
                    }
                }
            }
        });

        // Structure the data with repositories, categories, subcategories, folders, and workflows
        const hierarchicalData = repositories.map(repository => ({
            name: repository.name,
            categories: repository.categories.map(category => ({
                name: category.name,
                subcategories: category.subcategories.map(subcategory => ({
                    name: subcategory.name,
                    folders: subcategory.folders.map(folder => ({
                        name: folder.name,
                        workflows: folder.workflows.map(workflow => workflow.name)
                    }))
                }))
            }))
        }));

        // Return the hierarchical data with repositories, categories, subcategories, folders, and workflows to the frontend
        return res.status(200).json(hierarchicalData);
    } catch (error) {
        console.error('Error fetching repositories with folders and workflows:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


export default{
    getRepos,
    createRepositories,
    fetchRepositories
}