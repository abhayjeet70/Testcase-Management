const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(file, 'utf-8');

// 1. Add import
if (!content.includes('import ProjectsManager')) {
    content = content.replace(
        "import ProjectList from './components/projects/ProjectList';",
        "import ProjectList from './components/projects/ProjectList';\nimport ProjectsManager from './components/projects/ProjectsManager';"
    );
}

// 2. Add WorkspaceProjects render branch
const dashboardBranch = `          {activeTab === 'Dashboard' ? (
            <Dashboard
              projects={projects}
              testCases={testCases}
              activityLogs={activityLogs}
              onSelectProject={setSelectedProjectId}
              onNavigateToTab={setActiveTab}
            />
          ) : activeTab === 'AIGenerator' ? (`;

const newBranch = `          {activeTab === 'Dashboard' ? (
            <Dashboard
              projects={projects}
              testCases={testCases}
              activityLogs={activityLogs}
              onSelectProject={setSelectedProjectId}
              onNavigateToTab={setActiveTab}
            />
          ) : activeTab === 'WorkspaceProjects' ? (
            <ProjectsManager
              projects={projects}
              selectedProjectId={selectedProjectId}
              selectedDocumentId={selectedDocumentId}
              onSelectProject={handleSelectProject}
              onSelectDocument={handleSelectDocument}
              onAddProject={handleAddProject}
              onDeleteProject={handleDeleteProject}
              onDuplicateProject={handleDuplicateProject}
              onRenameProject={handleRenameProject}
              onToggleFavorite={handleToggleFavorite}
              onSelectTab={setActiveTab}
            />
          ) : activeTab === 'AIGenerator' ? (`;

if (!content.includes("activeTab === 'WorkspaceProjects'")) {
    content = content.replace(dashboardBranch, newBranch);
}

fs.writeFileSync(file, content, 'utf-8');
console.log('App.tsx updated');
