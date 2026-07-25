const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'components', 'projects', 'ProjectList.tsx');
let content = fs.readFileSync(file, 'utf-8');

// 1. Remove all unused state/methods
content = content.replace(/const \[projSearch[\s\S]*?const triggerRename = [\s\S]*?};\n/m, '');

// 2. Add Workspace Projects tab
const dashboardTab = `          <BarChart2 className="w-4 h-4" />
          Analytics Dashboard
        </button>`;
const newTab = `          <BarChart2 className="w-4 h-4" />
          Analytics Dashboard
        </button>

        <button
          onClick={() => onSelectTab('WorkspaceProjects')}
          className={\`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all \${
            activeTab === 'WorkspaceProjects' 
              ? 'bg-[#8B5A2B] text-white shadow-xs font-bold' 
              : 'text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF8F2]'
          }\`}
        >
          <FolderOpen className="w-4 h-4" />
          Workspace Projects
        </button>`;
content = content.replace(dashboardTab, newTab);

// 3. Remove from PROJECTS MAIN ZONE to end
const zoneStart = '{/* PROJECTS MAIN ZONE */}';
const idx = content.indexOf(zoneStart);
if (idx !== -1) {
    content = content.substring(0, idx);
    content += `    </div>
    </>
  );
}
`;
}

// 4. Remove unused imports
content = content.replace(/import ArchiveFavoritesPanel from '\.\/ArchiveFavoritesPanel';\n/, '');

fs.writeFileSync(file, content, 'utf-8');
console.log('ProjectList updated');
