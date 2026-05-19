# Chapter 2: Requirement Specification and System Analysis

## 2.1 Requirement Specification

Requirement specification is a critical phase in the software development lifecycle that defines what a system must accomplish and the constraints under which it must operate. According to Schwaber and Sutherland (2020), clear requirements enable development teams to deliver value incrementally while maintaining transparency and adaptability throughout the development process. The Emergency Messaging System (EMS) requirements are categorized into functional and non-functional requirements, each addressing distinct aspects of system behavior and performance.

### 2.1.1 Functional Requirements

Functional requirements describe the specific behaviors, features, and capabilities that the system must support (American Psychological Association [APA], 2020). The following functional requirements define the core operations of the EMS:

**FR-01: User Authentication and Authorization**
The system shall support multiple authentication mechanisms, including email and password login, Google OAuth 2.0 integration, and a development-mode login bypass. Each authenticated user shall receive a session token with a one-hour expiration period, enabling stateless authentication across API requests.

**FR-02: Role-Based Access Control**
The system shall implement a hierarchical role-based access control (RBAC) model comprising five user roles: admin, responder, operator, viewer, and victim. Each role shall have a defined set of permissions that determine access to system features and data. Admin users shall have full system control, while the specific access rights for each role are enforced at both the API middleware layer and the frontend interface. Sandhu et al. (2000) established that RBAC simplifies permission management by associating permissions with roles rather than individual users, a principle directly applied in the EMS architecture.

**FR-03: Emergency Event Management**
The system shall allow authorized users (admin, responder, operator) to create, update, resolve, and delete emergency events. Each event shall include a title, severity level (critical, high, medium, low), description, location data, and timestamps. Events shall transition through lifecycle states: active, resolved, and archived. All event-related actions shall be recorded in an audit log and event timeline for accountability.

**FR-04: Event-Scoped Messaging**
The system shall provide a real-time messaging board scoped to each emergency event. Users assigned to an event shall be able to send text messages with optional priority levels (normal, high, urgent). Victims shall be restricted to normal priority only. Messages shall support file attachments and include metadata such as sender identity, timestamp, and message type (text, alert, system, command).

**FR-05: Alert Broadcasting and Acknowledgment**
The system shall support the dispatch of broadcast alerts categorized by type: evacuation, lockdown, medical, fire, weather, security, and test. Alerts shall be targetable by recipient role and shall deliver notifications in real-time via WebSocket push. Authorized users (admin, responder, operator) shall be able to acknowledge alerts, with the system recording the acknowledging user and timestamp.

**FR-06: Distress Signal Management**
The system shall allow victim users to send distress or SOS signals, optionally associated with a specific emergency event and location. Non-victim roles (admin, responder, operator) shall be able to view active distress signals, respond by assigning themselves as the responder, and later mark signals as resolved. New distress signals shall generate real-time toast notifications via WebSocket.

**FR-07: Direct Messaging**
The system shall enable private direct messaging between users. Victims shall be restricted to messaging only non-victim users (admin, responder, operator, viewer). The interface shall include polling-based conversation updates every three seconds, unread message badges on the navigation sidebar, and automatic marking of messages as read upon conversation selection.

**FR-08: User Management**
The system shall allow admin users to view all registered users, modify user roles, and activate or deactivate accounts. Non-admin roles with user-viewing permissions (responder, operator) may view the user list but shall not modify roles or account status. User profile management shall include avatar upload, emergency contact information, and password changes.

**FR-09: System Automation and Administration**
The system shall provide an admin-only automation panel supporting health checks, daily summary report generation, automatic archiving of resolved events, escalation of unacknowledged alerts, retry of failed dead-letter queue messages, and audit log retrieval with filtering capabilities.

**FR-10: Data Export and Import**
The system shall support export and import of data in multiple formats. CSV export shall be available for users, events, alerts, and messages. XML export and import shall be available for event messages. These capabilities enable data portability and external analysis of emergency response data.

**FR-11: Announcements**
The system shall allow admin users to create system-wide announcements with configurable title, content, target role, and optional expiry date. The most recent non-expired announcement matching the user's role shall be displayed in a dismissible notification bar.

**FR-12: Emergency Hotline Directory**
The system shall display a static directory of emergency hotlines for Mati City, Davao Oriental, Philippines, including national emergency services, disaster risk reduction, medical services, police, fire department, Red Cross, and other critical contact numbers.

### 2.1.2 Non-Functional Requirements

Non-functional requirements define the quality attributes, constraints, and performance characteristics that the system must exhibit (APA, 2020). These requirements are essential for ensuring system reliability, security, and usability in emergency contexts.

**NFR-01: Security**
The system shall implement defense-in-depth security measures. All database queries shall use PHP Data Objects (PDO) with prepared statements to prevent SQL injection attacks. Passwords shall be hashed using bcrypt. Session tokens shall use base64-encoded JSON with one-hour expiration. Role-based access control shall be enforced at both the API middleware and frontend layers. The PHP documentation emphasizes that PDO prepared statements structurally separate SQL logic from user-supplied data, making injection attacks infeasible (PHP Documentation Group, 2024).

**NFR-02: Performance**
The system shall maintain responsive performance under concurrent usage. Direct message polling shall occur every three seconds. Distress signal polling shall occur every ten seconds. The frontend shall load and render data within acceptable timeframes for emergency response scenarios. Real-time notifications via WebSocket shall have minimal latency for alert and distress signal delivery.

**NFR-03: Reliability**
The system shall maintain data integrity through MySQL transaction support and ACID compliance. A dead-letter queue mechanism shall capture failed operations for later retry. System automation shall include health checks to validate ongoing system functionality. The database schema shall enforce referential integrity through foreign key constraints across all 11 tables.

**NFR-04: Availability**
The system shall be accessible through standard web browsers without requiring additional plugins. The frontend shall be served through a Node.js static file server on port 3000, while the PHP backend shall operate on port 8000. WebSocket communication for real-time features shall operate on port 3001. The system shall follow a stateless REST architecture, which Fielding (2000) demonstrated enables scalability and independent component deployment.

**NFR-05: Usability**
The system shall support both light and dark mode themes through CSS custom properties. The user interface shall be responsive and accessible across devices. Navigation shall be clear with role-appropriate menus. Status indicators shall use distinct color coding for readability in both visual themes. Quick-reply buttons shall be provided for victim users to streamline communication during emergencies.

**NFR-06: Maintainability**
The system shall follow a modular architecture with separation of concerns between the frontend (vanilla JavaScript components), backend (PHP MVC-style with models, services, and middleware), and database layer. PSR-4 autoloading shall be used for PHP class organization. The codebase shall be version-controlled using Git with descriptive commit messages.

**NFR-07: Scalability**
The backend architecture shall support horizontal scaling through stateless authentication tokens, enabling load-balanced deployments. The WebSocket server shall be independently deployable. Database queries shall be optimized through proper indexing and parameterized prepared statements to maintain performance under increased load.

**NFR-08: Auditability**
All user actions that modify system state shall be recorded in an audit log table, capturing the user identity, action performed, timestamp, and affected entities. Event timelines shall provide chronological records of all actions taken on each emergency event. This audit trail supports post-incident analysis and accountability.

## 2.2 System Analysis

System analysis examines the operational context of the software system by modeling its business processes and the interactions between users and the system (APA, 2020). Understanding how the EMS integrates into emergency response workflows is critical for designing a system that effectively supports crisis communication and coordination.

### 2.2.1 Business Process

The business processes of the Emergency Messaging System are modeled around the core emergency response lifecycle: preparedness, notification, response, coordination, and resolution. Haupt (2021) emphasized that effective crisis communication strategies must adapt to local community needs and crisis types, a principle that guided the design of the EMS business processes.

**Process 1: User Registration and Onboarding**
The process begins when a new user accesses the system. Users may register via email, Google OAuth, or a development bypass. During registration, the system assigns an initial role (admin for the first user, responder for subsequent users) and creates a user profile. The system validates credentials and generates a session token for API access. All registration events are recorded in the audit log.

**Process 2: Emergency Event Creation and Management**
Authorized personnel (admin, responder, operator) create an emergency event by specifying its title, severity, description, and location. The system records the event with an "active" status, generates a timeline entry, and logs the creation in the audit log. Responders monitor active events through a severity-sorted dashboard. Events are resolved when the emergency concludes, and archived after a configurable period via system automation.

**Process 3: Alert Dissemination**
When an emergency requires public notification, authorized users dispatch alerts through the system. The dispatcher selects the alert type (e.g., evacuation, lockdown, medical) and target audience by role. The system broadcasts the alert via WebSocket push to connected clients. Recipients acknowledge receipt, and the system tracks acknowledgment status. Entress et al. (2023) found that multi-modal public alert and warning systems significantly improve community safety outcomes, supporting the EMS approach of combining in-app alerts with real-time push notifications.

**Process 4: Distress Signal Handling**
A victim user initiates a distress signal through the SOS button, providing optional event association and location data. The system logs the distress signal and broadcasts a real-time notification to authorized responders. Responders view active distress signals and assign themselves to provide assistance. Once the situation is addressed, the responder or victim marks the distress signal as resolved. The system records the entire lifecycle for post-incident review.

**Process 5: Event Communication and Coordination**
Emergency events generate scoped message threads where assigned personnel communicate. Team members share updates, coordinate resources, and document critical information. Messages carry priority indicators (normal, high, urgent) to help triage attention. File attachments support sharing of documents, images, and other operational data. The system maintains a complete message history for each event, supporting both real-time coordination and after-action analysis.

**Process 6: Resource Management**
Admins and operators assign personnel, equipment, and supplies to emergency events. Resources are tracked by type and status (available, deployed, depleted). This process ensures that response efforts have visibility into resource allocation and availability throughout the emergency lifecycle.

**Process 7: Direct Communication**
Personnel communicate privately through direct messages for coordination that does not require event-scoped visibility. The messaging interface supports conversation threading, unread indicators, and rapid polling for near-real-time delivery. Victim-to-victim messaging is restricted to prevent misuse and maintain communication channel integrity.

**Process 8: Reporting and Analysis**
Following emergency resolution, the system generates reports through its reporting module. Admins can produce printable incident reports, export data in CSV or XML format, and review audit logs. These reports support after-action reviews and continuous improvement of emergency response procedures.

### 2.2.2 Use Case

Use case modeling describes the interactions between external actors and the system to achieve specific goals (APA, 2020). The EMS has five primary actors corresponding to the RBAC hierarchy, each with distinct use cases based on their role permissions. Fette and Melnikov (2011) specified the WebSocket protocol that enables the real-time bidirectional communication essential for several use cases, while Pimentel and Nickerson (2012) demonstrated that WebSocket technology significantly outperforms HTTP polling for real-time data display applications.

**Actors**

| Actor | Description |
|---|---|
| Admin | Full system administrator with access to all features including user management, system automation, audit logs, and data tools |
| Responder | Field response personnel who create events, dispatch alerts, respond to distress signals, and manage resources |
| Operator | Command and control personnel who monitor events, manage resources, and coordinate response efforts |
| Viewer | Read-only monitoring personnel who observe events, alerts, and communications without modification capabilities |
| Victim | End users requiring assistance who can send distress signals, participate in event messaging, and use direct messaging to communicate with providers |

**UC-01: Authenticate User**
- **Actor:** All actors
- **Description:** Any user accessing the system must authenticate to establish their identity and obtain an authorized session.
- **Precondition:** User has a registered account or Google account.
- **Flow:** User selects authentication method → system validates credentials → system generates session token → system redirects to appropriate dashboard based on role.
- **Postcondition:** User is authenticated and granted role-appropriate access.

**UC-02: Manage Emergency Events**
- **Actors:** Admin, Responder, Operator
- **Description:** Authorized users create, update, resolve, and delete emergency events. Events represent specific incidents requiring coordinated response.
- **Precondition:** User is authenticated with event management permissions.
- **Flow:** User navigates to events → selects action (create/update/resolve/delete) → provides event details → system validates and processes request → system records timeline and audit entries.
- **Postcondition:** Event is created or updated in the database with appropriate lifecycle status.

**UC-03: View Emergency Events**
- **Actors:** All actors (view-only for Viewer and Victim)
- **Description:** All users can view active and resolved emergency events sorted by severity.
- **Precondition:** User is authenticated.
- **Flow:** User navigates to dashboard → system loads event list with severity sort → user can filter by status (active, resolved, archived).
- **Postcondition:** Events are displayed according to user's viewing permissions.

**UC-04: Dispatch Alerts**
- **Actors:** Admin, Responder
- **Description:** Authorized users broadcast alerts to targeted user roles during emergencies.
- **Precondition:** User has alert dispatch permissions.
- **Flow:** User opens alert modal → selects alert type → selects target role → enters title and message → system broadcasts alert via WebSocket → recipients receive real-time notification.
- **Postcondition:** Alert is dispatched and recorded in the system; recipients can acknowledge.

**UC-05: Send Event Message**
- **Actors:** All actors
- **Description:** Users send messages within an emergency event scope to coordinate response.
- **Precondition:** User is authenticated and an active event exists.
- **Flow:** User selects event from dropdown → enters message text or attaches file → optionally sets priority (restricted for victims) → system validates and stores message → other users in the event see the message in real-time.
- **Postcondition:** Message is stored with event association.
- **Special Requirements:** Victims are restricted to normal priority. All event participants can see messages.

**UC-06: Send Direct Message**
- **Actors:** All actors
- **Description:** Users send private messages to other users for one-on-one communication.
- **Precondition:** User is authenticated.
- **Flow:** User selects recipient from user list → enters message → system validates recipient permissions (victims cannot message victims) → system stores and delivers message via polling mechanism.
- **Postcondition:** Message is stored and recipient receives notification.
- **Special Requirements:** Victim-to-victim messaging is blocked; victim-to-provider messaging is permitted.

**UC-07: Send Distress Signal**
- **Actor:** Victim
- **Description:** Victims send SOS or distress signals to request assistance during emergencies.
- **Precondition:** Victim user is authenticated.
- **Flow:** User clicks SOS button or opens distress modal → optionally selects associated event and provides location → system creates distress signal → system broadcasts notification to responders via WebSocket → system logs and timestamps the signal.
- **Postcondition:** Distress signal is active and visible to authorized responders.

**UC-08: Respond to Distress Signal**
- **Actors:** Admin, Responder, Operator
- **Description:** Authorized users respond to active distress signals to provide assistance.
- **Precondition:** Distress signal exists in active status; user has distress response permissions.
- **Flow:** User views active distress signals → clicks "Respond" → system assigns user as responder → status changes to "responded" → after resolution, user or victim marks as "resolved."
- **Postcondition:** Distress signal is assigned to a responder and ultimately resolved.

**UC-09: Manage Users**
- **Actor:** Admin
- **Description:** Admins manage user accounts and roles to control system access.
- **Precondition:** Admin user is authenticated.
- **Flow:** User navigates to user management → views user list → selects user → modifies role or account status → system validates and updates → audit log records the change.
- **Postcondition:** User role or status is updated in the database.

**UC-10: Run System Automation**
- **Actor:** Admin
- **Description:** Admins execute system maintenance tasks including health checks, event archiving, alert escalation, queue retry, and report generation.
- **Precondition:** Admin user is authenticated.
- **Flow:** User accesses admin panel → selects automation action (health check, archive, escalate, retry, report) → system executes selected operation → system returns results.
- **Postcondition:** Automation task is executed and results are displayed.

## References

American Psychological Association. (2020). *Publication manual of the American Psychological Association* (7th ed.). https://doi.org/10.1037/0000165-000

Entress, R. M., Tyler, J., Sadiq, A.-A., & Tysiachny, N. (2023). Public alert and warning system literature review in the USA: Identifying research gaps and lessons for practice. *Natural Hazards, 117*, 1711–1744. https://doi.org/10.1007/s11069-023-05926-x

Fette, I., & Melnikov, A. (2011). *The WebSocket protocol* (RFC 6455). Internet Engineering Task Force. https://doi.org/10.17487/RFC6455

Fielding, R. T. (2000). *Architectural styles and the design of network-based software architectures* [Doctoral dissertation, University of California, Irvine]. https://ics.uci.edu/~fielding/pubs/dissertation/fielding_dissertation.pdf

Haupt, B. (2021). The use of crisis communication strategies in emergency management. *Journal of Homeland Security and Emergency Management, 18*(1), 29–50. https://doi.org/10.1515/jhsem-2020-0039

PHP Documentation Group. (2024). *PHP manual: PDO*. PHP.net. https://www.php.net/manual/en/book.pdo.php

Pimentel, V., & Nickerson, B. G. (2012). Communicating and displaying real-time data with WebSocket. *IEEE Internet Computing, 16*(4), 45–53. https://doi.org/10.1109/MIC.2012.64

Sandhu, R., Ferraiolo, D., & Kuhn, R. (2000). The NIST model for role-based access control: Towards a unified standard. In *Proceedings of the Fifth ACM Workshop on Role-Based Access Control (RBAC '00)* (pp. 47–63). Association for Computing Machinery. https://doi.org/10.1145/344287.344301

Schwaber, K., & Sutherland, J. (2020). *The Scrum Guide: The definitive guide to Scrum: The rules of the game*. Scrum.org. https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-US.pdf
