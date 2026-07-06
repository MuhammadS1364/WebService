



import { Routes, Route } from 'react-router-dom';
import GetWay from './GetWay/GetWay';


// Admin Specila components
import AdminPanel from './AdminPanel/Dashboard/AdminPanel';

import AllProgrammesList from './PublicProgrammesComponents/AllProgrammesList';
import ProgrammesRegistrationCard from './PublicProgrammesComponents/ProgrammesRegistrationCard';
import ProgrammesCalendar from './PublicProgrammesComponents/ProgramCelender';
import ProgrammeRegistration from './PublicProgrammesComponents/ProgramRegistration';

import EditeStudentRecord from './AdminPanel/Student/EditeInfoStudent';
import OurStudentsList from './AdminPanel/Student/AllStudentList';
import AllUsersList from './AdminPanel/Users/AllUserList';
import StudentRegistration from './AdminPanel/Student/CreateStudent';

import AllWingsList from './AdminPanel/Wing/AllWingsList';
import CreateNewWing from './AdminPanel/Wing/CreateWing';
import StudentPanel from './StudentPanel/Dashboard/StudentPanel';
import StudentDashBoard from './StudentPanel/Dashboard/StudentDashboard';
import WingPanel from './WingPanel/DashBoard/WingPanel';
import CreateResult from './PublicProgrammesComponents/CreateResult';
import CandidateRegistration from './PublicDashboardComp/CandidateRegistration';
import AdminDashboard from './AdminPanel/Dashboard/AdminDashBoard';
import WingDashboard from './WingPanel/DashBoard/WingDashoard';
import WingAnylatics from './WingPanel/WingAnylatics/WingAnylatics';
import WingProgrammes from './WingPanel/WingProgrammes/WingProgrammes';
import WingResults from './WingPanel/WingResults/WingResults';
import OutReachPanel from './OutReachPanel/DashBoard/OutReachPanel';
import OutReachDashboard from './OutReachPanel/DashBoard/OutReachDashboard';
import CreateAchievements from './OutReachPanel/OutReach/CreateAchievements';
import CreateOutReach from './OutReachPanel/OutReach/CreateOutReach';

export default function App() {
  return (
    <>
      <Routes>
        <Route path='/login' element={<GetWay />} />
        <Route path='/cand/:P_Code' element={<CandidateRegistration />} />

        <Route path='/admin-panel/:actUser' element={<AdminPanel />} >
          <Route path='Programmes-List' element={<AllProgrammesList />} />
          <Route path='dashBoard' element={<AdminDashboard />} />
          <Route path='programmes-card' element={<ProgrammesRegistrationCard />} />
          <Route path='programmes-celender' element={<ProgrammesCalendar />} />
          <Route path='create-program' element={<ProgrammeRegistration />} />
          <Route path='candidate-registration/:P_Code' element={<CandidateRegistration />} />

          <Route path='edite-student/:StnAddNo' element={<EditeStudentRecord />} />
          <Route path='all-students' element={<OurStudentsList />} />
          <Route path='new-student' element={<StudentRegistration />} />
          <Route path='all-users' element={<AllUsersList />} />

          <Route path='all-wings-list' element={<AllWingsList />} />
          <Route path='create-wing' element={<CreateNewWing />} />

        </Route>

        <Route path='/student-panel/:actStn' element={< StudentPanel />} >
          <Route path='stn-dashboard' element={<StudentDashBoard />} />
          <Route path='candidate-registration/:P_Code' element={<CandidateRegistration />} />

        </Route>
        <Route path='/wing-panel/:actWing' element={< WingPanel />} >
          <Route path='wing-dashboard' element={<WingDashboard />} />
          <Route path='create-result' element={<CreateResult />} />
          <Route path='create-program' element={<ProgrammeRegistration />} />
          <Route path='wing-anylatics' element={<WingAnylatics />} />
          <Route path='wing-programmes' element={<WingProgrammes />} />
          <Route path='wing-results' element={<WingResults />} />


        </Route>
        <Route path='/outreach-panel/:actOutReach' element={<OutReachPanel />} >
          <Route path='dashboard' element={<OutReachDashboard />} />
          <Route path='create-achievements' element={<CreateAchievements />} />
          <Route path='create-outreach' element={<CreateOutReach />} />

        </Route>
        {/* 

        <Route path='' element={< />} >

        </Route>

        <Route path='' element={< />} >

        </Route>

        <Route path='' element={< />} >

        </Route>

        <Route path='' element={< />} >

        </Route>

        <Route path='' element={< />} >

        </Route> */}

      </Routes>
    </>
  );
}
