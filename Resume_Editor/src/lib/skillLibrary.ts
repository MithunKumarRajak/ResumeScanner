// 500+ skill suggestions for autocomplete
export const SKILL_LIBRARY: Record<string, string[]> = {
  Technical: [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Swift', 'Kotlin',
    'PHP', 'Ruby', 'Scala', 'R', 'MATLAB', 'Dart', 'Elixir', 'Haskell', 'Lua', 'Perl',
    'React', 'Next.js', 'Vue.js', 'Nuxt.js', 'Angular', 'Svelte', 'Remix', 'Astro',
    'Node.js', 'Express.js', 'FastAPI', 'Django', 'Flask', 'Spring Boot', 'Laravel', 'Rails',
    'GraphQL', 'REST API', 'WebSockets', 'gRPC', 'OAuth', 'JWT',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra', 'SQLite',
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'scikit-learn', 'NLP', 'Computer Vision',
    'Data Analysis', 'Data Visualization', 'Pandas', 'NumPy', 'Matplotlib', 'Seaborn',
    'HTML5', 'CSS3', 'Sass/SCSS', 'Tailwind CSS', 'Bootstrap', 'Material UI', 'Figma',
    'Microservices', 'Serverless', 'Event-Driven Architecture', 'CQRS', 'Domain-Driven Design',
    'Blockchain', 'Smart Contracts', 'Solidity', 'Web3.js', 'Ethereum',
    'iOS Development', 'Android Development', 'React Native', 'Flutter', 'Expo',
    'Testing', 'TDD', 'BDD', 'Jest', 'Pytest', 'Cypress', 'Playwright', 'Selenium',
    'SQL', 'NoSQL', 'Database Design', 'Data Modeling', 'ETL', 'Data Warehousing',
    'Computer Science', 'Algorithms', 'Data Structures', 'System Design', 'OOP', 'Functional Programming',
  ],
  Tools: [
    'AWS', 'Google Cloud', 'Azure', 'Vercel', 'Netlify', 'Heroku', 'DigitalOcean',
    'Docker', 'Kubernetes', 'Helm', 'Terraform', 'Ansible', 'Pulumi',
    'CI/CD', 'GitHub Actions', 'Jenkins', 'CircleCI', 'GitLab CI', 'Travis CI',
    'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN',
    'Linux', 'Bash/Shell', 'PowerShell', 'Unix',
    'Nginx', 'Apache', 'Caddy', 'HAProxy', 'Load Balancing',
    'VS Code', 'IntelliJ', 'Vim', 'Neovim', 'Emacs',
    'Jira', 'Confluence', 'Notion', 'Trello', 'Asana', 'Linear',
    'Slack', 'Teams', 'Zoom',
    'Postman', 'Insomnia', 'Swagger', 'API Testing',
    'Datadog', 'New Relic', 'Grafana', 'Prometheus', 'Sentry',
    'Figma', 'Sketch', 'Adobe XD', 'InVision', 'Zeplin',
    'Photoshop', 'Illustrator', 'After Effects', 'Premiere Pro',
    'Tableau', 'Power BI', 'Looker', 'Metabase', 'Superset',
    'Salesforce', 'HubSpot', 'Marketo', 'Zendesk', 'ServiceNow',
    'SAP', 'Oracle ERP', 'QuickBooks', 'Xero',
    'Excel', 'Google Sheets', 'PowerPoint', 'Google Slides', 'Word',
    'Kubernetes', 'OpenShift', 'Rancher', 'ECS', 'EKS', 'GKE',
    'RabbitMQ', 'Apache Kafka', 'AWS SQS', 'NATS', 'Celery',
    'Elasticsearch', 'Kibana', 'Logstash', 'Splunk',
    'Nginx', 'HAProxy', 'Envoy', 'Istio', 'Service Mesh',
  ],
  Soft: [
    'Leadership', 'Team Management', 'Mentorship', 'Coaching',
    'Communication', 'Presentation', 'Public Speaking', 'Technical Writing',
    'Problem Solving', 'Critical Thinking', 'Analytical Thinking',
    'Project Management', 'Agile', 'Scrum', 'Kanban', 'Waterfall',
    'Stakeholder Management', 'Client Relations', 'Customer Success',
    'Product Strategy', 'Product Roadmapping', 'Requirements Gathering',
    'Cross-functional Collaboration', 'Conflict Resolution', 'Negotiation',
    'Time Management', 'Prioritization', 'Multitasking',
    'Adaptability', 'Resilience', 'Growth Mindset',
    'Creativity', 'Innovation', 'Design Thinking',
    'Emotional Intelligence', 'Empathy', 'Active Listening',
    'Strategic Planning', 'Business Development', 'Market Research',
    'Data-Driven Decision Making', 'Risk Management',
    'Budget Management', 'Resource Planning', 'Vendor Management',
    'Recruitment', 'Hiring', 'Performance Reviews', 'OKRs',
  ],
  Languages: [
    'English', 'Spanish', 'French', 'German', 'Mandarin Chinese', 'Japanese',
    'Korean', 'Portuguese', 'Italian', 'Russian', 'Arabic', 'Hindi',
    'Dutch', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Polish',
    'Turkish', 'Vietnamese', 'Thai', 'Indonesian', 'Malay',
    'Hebrew', 'Persian/Farsi', 'Urdu', 'Bengali', 'Tamil',
    'Greek', 'Czech', 'Hungarian', 'Romanian', 'Ukrainian',
  ],
};

export function searchSkills(query: string): string[] {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  const results: string[] = [];
  
  Object.values(SKILL_LIBRARY).forEach((skills) => {
    skills.forEach((skill) => {
      if (skill.toLowerCase().includes(q) && !results.includes(skill)) {
        results.push(skill);
      }
    });
  });
  
  return results.slice(0, 8);
}

export function getCategoryForSkill(skillName: string): 'Technical' | 'Soft' | 'Tools' | 'Languages' {
  for (const [category, skills] of Object.entries(SKILL_LIBRARY)) {
    if (skills.some((s) => s.toLowerCase() === skillName.toLowerCase())) {
      return category as 'Technical' | 'Soft' | 'Tools' | 'Languages';
    }
  }
  return 'Technical';
}
