import { TestCaseTemplate } from '../types';

const now = () => new Date().toISOString();

function tpl(
  id: string,
  name: string,
  moduleName: string,
  testCases: TestCaseTemplate['testCases']
): TestCaseTemplate {
  return {
    id,
    name,
    moduleName,
    defaultStatus: 'Not Tested',
    priority: 'Medium',
    testCases,
    isBuiltIn: true,
    created_at: now(),
    updated_at: now(),
  };
}

export const DEFAULT_TEMPLATES: TestCaseTemplate[] = [
  tpl('tpl-login', 'Login', 'LOGIN', [
    { name: 'Valid credentials login', test_objective: 'Verify user can log in with valid credentials', test_steps: '<ol><li>Navigate to login page</li><li>Enter valid email and password</li><li>Click Sign In</li><li>Verify redirect to dashboard</li></ol>', priority: 'Critical' },
    { name: 'Invalid password', test_objective: 'Verify error on wrong password', test_steps: '<ol><li>Enter valid email and invalid password</li><li>Click Sign In</li><li>Verify error message displayed</li></ol>', priority: 'High' },
    { name: 'Empty fields validation', test_objective: 'Verify required field validation', test_steps: '<ol><li>Leave fields empty</li><li>Click Sign In</li><li>Verify validation messages</li></ol>', priority: 'Medium' },
    { name: 'Remember me checkbox', test_objective: 'Verify session persistence', test_steps: '<ol><li>Check Remember Me</li><li>Log in successfully</li><li>Close and reopen browser</li><li>Verify still logged in</li></ol>', priority: 'Low' },
  ]),
  tpl('tpl-registration', 'Registration', 'REGISTRATION', [
    { name: 'Successful registration', test_objective: 'New user can register', test_steps: '<ol><li>Fill all required fields</li><li>Submit form</li><li>Verify success message</li></ol>', priority: 'Critical' },
    { name: 'Duplicate email', test_objective: 'Block duplicate accounts', test_steps: '<ol><li>Register with existing email</li><li>Verify error shown</li></ol>', priority: 'High' },
    { name: 'Password strength', test_objective: 'Enforce password rules', test_steps: '<ol><li>Enter weak password</li><li>Verify strength indicator</li></ol>', priority: 'Medium' },
    { name: 'Terms acceptance', test_objective: 'Require terms checkbox', test_steps: '<ol><li>Submit without accepting terms</li><li>Verify blocked</li></ol>', priority: 'Medium' },
  ]),
  tpl('tpl-contact', 'Contact Form', 'CONTACT', [
    { name: 'Submit valid contact form', test_objective: 'Form sends successfully', test_steps: '<ol><li>Fill name, email, message</li><li>Submit</li><li>Verify confirmation</li></ol>', priority: 'High' },
    { name: 'Invalid email format', test_objective: 'Validate email field', test_steps: '<ol><li>Enter invalid email</li><li>Verify validation error</li></ol>', priority: 'Medium' },
    { name: 'Required fields', test_objective: 'All required fields enforced', test_steps: '<ol><li>Submit empty form</li><li>Verify errors on required fields</li></ol>', priority: 'Medium' },
  ]),
  tpl('tpl-navigation', 'Navigation', 'NAVIGATION', [
    { name: 'Main menu links', test_objective: 'All nav links work', test_steps: '<ol><li>Click each main nav item</li><li>Verify correct page loads</li></ol>', priority: 'High' },
    { name: 'Breadcrumb trail', test_objective: 'Breadcrumbs reflect path', test_steps: '<ol><li>Navigate deep into site</li><li>Verify breadcrumb accuracy</li></ol>', priority: 'Low' },
    { name: 'Mobile hamburger menu', test_objective: 'Mobile nav opens and closes', test_steps: '<ol><li>Resize to mobile</li><li>Open menu</li><li>Navigate and close</li></ol>', priority: 'Medium' },
  ]),
  tpl('tpl-search', 'Search', 'SEARCH', [
    { name: 'Keyword search results', test_objective: 'Search returns relevant results', test_steps: '<ol><li>Enter search term</li><li>Verify results contain term</li></ol>', priority: 'High' },
    { name: 'Empty search', test_objective: 'Handle empty query', test_steps: '<ol><li>Submit empty search</li><li>Verify appropriate message</li></ol>', priority: 'Low' },
    { name: 'No results state', test_objective: 'Display no results UI', test_steps: '<ol><li>Search nonsense string</li><li>Verify no results message</li></ol>', priority: 'Medium' },
  ]),
  tpl('tpl-dashboard', 'Dashboard', 'DASHBOARD', [
    { name: 'Dashboard loads metrics', test_objective: 'Widgets display data', test_steps: '<ol><li>Navigate to dashboard</li><li>Verify stat cards populate</li></ol>', priority: 'High' },
    { name: 'Chart rendering', test_objective: 'Charts render without error', test_steps: '<ol><li>Verify pie/bar charts visible</li><li>Hover tooltips work</li></ol>', priority: 'Medium' },
    { name: 'Date range filter', test_objective: 'Filter updates metrics', test_steps: '<ol><li>Change date range</li><li>Verify data refreshes</li></ol>', priority: 'Medium' },
  ]),
  tpl('tpl-footer', 'Footer', 'FOOTER', [
    { name: 'Footer links', test_objective: 'All footer links valid', test_steps: '<ol><li>Click each footer link</li><li>Verify no 404</li></ol>', priority: 'Low' },
    { name: 'Social media icons', test_objective: 'Social links open correctly', test_steps: '<ol><li>Click social icons</li><li>Verify correct URLs</li></ol>', priority: 'Low' },
    { name: 'Copyright year', test_objective: 'Copyright shows current year', test_steps: '<ol><li>Check footer copyright text</li></ol>', priority: 'Low' },
  ]),
  tpl('tpl-forms', 'Forms', 'FORMS', [
    { name: 'Dropdown selections', test_objective: 'Dropdowns save values', test_steps: '<ol><li>Select each dropdown option</li><li>Submit and verify saved</li></ol>', priority: 'Medium' },
    { name: 'Checkbox groups', test_objective: 'Multiple checkboxes work', test_steps: '<ol><li>Toggle checkboxes</li><li>Verify state persisted</li></ol>', priority: 'Medium' },
    { name: 'File upload', test_objective: 'File upload accepts valid types', test_steps: '<ol><li>Upload valid file</li><li>Verify success</li></ol>', priority: 'High' },
    { name: 'Form reset', test_objective: 'Reset clears all fields', test_steps: '<ol><li>Fill form</li><li>Click Reset</li><li>Verify fields cleared</li></ol>', priority: 'Low' },
  ]),
  tpl('tpl-responsive', 'Responsive Testing', 'RESPONSIVE', [
    { name: 'Desktop layout 1920px', test_objective: 'Layout correct at desktop', test_steps: '<ol><li>Set viewport 1920x1080</li><li>Verify layout</li></ol>', priority: 'Medium' },
    { name: 'Tablet layout 768px', test_objective: 'Layout adapts on tablet', test_steps: '<ol><li>Set viewport 768px</li><li>Verify responsive breakpoints</li></ol>', priority: 'Medium' },
    { name: 'Mobile layout 375px', test_objective: 'Mobile layout usable', test_steps: '<ol><li>Set viewport 375px</li><li>Verify no horizontal scroll</li></ol>', priority: 'High' },
    { name: 'Touch targets', test_objective: 'Buttons large enough on mobile', test_steps: '<ol><li>Check button sizes on mobile</li><li>Verify min 44px touch targets</li></ol>', priority: 'Medium' },
  ]),
];
