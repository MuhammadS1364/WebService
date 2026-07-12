import { Routes, Route } from 'react-router-dom';

import NotFoundPage from './GetWay/NoFoundPage';
import ProtectedRoute from './GetWay/ProtectedRoute';

import GetWay from './GetWay/GetWay';

// Admin Special components
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
import AdminDashboard from './AdminPanel/Dashboard/AdminDashBoard';

// Student Components
import StudentPanel from './StudentPanel/Dashboard/StudentPanel';
import StudentDashBoard from './StudentPanel/Dashboard/StudentDashboard';
import StudentsAchievements from './StudentPanel/StudentAchievements/StudentAchievements';
import StudentsOutReach from './StudentPanel/StudentOutReach/StudentOutReach';
import StudentAnalytics from './StudentPanel/Anylatics/StudentAnylatics';
import StudentProgrammes from './StudentPanel/StudentProgram/StudentProgrammes';

// Wing Components
import WingPanel from './WingPanel/DashBoard/WingPanel';
import WingDashboard from './WingPanel/DashBoard/WingDashoard';
import CreateResult from './PublicProgrammesComponents/CreateResult';
import WingAnylatics from './WingPanel/WingAnylatics/WingAnylatics';
import WingProgrammes from './WingPanel/WingProgrammes/WingProgrammes';
import WingResults from './WingPanel/WingResults/WingResults';
import CandidateRegistration from './PublicDashboardComp/CandidateRegistration';

// Outreach Components
import OutReachPanel from './OutReachPanel/DashBoard/OutReachPanel';
import OutReachDashboard from './OutReachPanel/DashBoard/OutReachDashboard';
import CreateAchievements from './OutReachPanel/OutReach/CreateAchievements';
import CreateOutReach from './OutReachPanel/OutReach/CreateOutReach';
import OutReachAndAchievements from './PublicHome/OutReachAndAchievements/OutReachAndAchievements';
import PublicHomePanel from './PublicHome/PublicHomePanel';
import PublicPageDashboard from './PublicHome/PublicDashboard';
import OurHighLights from './PublicHome/OutReachAndAchievements/OurHighlights';
import CreateHighLight from './AdminPanel/OurHighLight/CreateHighLight';
import CreateDonationForUs from './PublicHome/OutReachAndAchievements/CreateDonation';
import AllDonators from './AdminPanel/Donation/AllDonationList';
import AllTreasurerList from './AdminPanel/Treasurer/AllTreasurerList';
import CreateTreasurer from './AdminPanel/Treasurer/CreateTreasurer';
import TreasurerPanel from './Treasurer/Dashboard/TreasurerPanel';
import TreasurerDashboard from './Treasurer/Dashboard/TreasurerDashboard';
import CreateExpanceOrIncome from './Treasurer/Expances/CreateExpance';
import TreasureAnalatics from './Treasurer/Expances/TreasurerAnalytics';
import ExpancesDetail from './AdminPanel/Treasurer/ExpanceDetail';
import AdminProgrammesList from './AdminPanel/AdminProgrammesList/AdminProgrammesList';
import CreateBankDeatils from './AdminPanel/Donation/CreateBankDeatil';
import BankDetailsList from './AdminPanel/Donation/BankDetailsList';
import OutReachAnaylatics from './OutReachPanel/Anaylatics/OutReachAnaylatics';
import PublicProgrammesList from './PublicProgrammesComponents/AllProgrammesList';

export default function App() {
  return (
    <>
      <Routes>
        {/* PUBLIC ROUTES (No Login Required) */}
        <Route path='/login' element={<GetWay />} />
        {/* <Route path='/cal' index element={<ProgrammesCalendar />} /> */}

        {/* FIXED: Removed leading slashes from nested children and cleaned up 'index' attributes */}
        <Route path='/public-panel' element={<PublicHomePanel />} >
          <Route index element={<PublicPageDashboard />} /> {/* This renders automatically at /public-panel */}
          <Route path='dashboard' element={<PublicPageDashboard />} />
          <Route path='our-hightligths-evens' element={<OurHighLights />} />
          <Route path='our-wing-list' element={<AllWingsList />} />
          <Route path='our-programmes' element={<PublicProgrammesList />} />
          <Route path='our-achievements' element={<OutReachAndAchievements />} />
          <Route path='programmes-calendar' element={<ProgrammesCalendar />} />
          <Route path='donate-us' element={<CreateDonationForUs />} />
        </Route>

        {/* ADMIN PANEL (Protected) */}
        <Route path='/admin-panel/:actUser' element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path='Programmes-List' element={<AdminProgrammesList />} />
          <Route path='dashBoard' element={<AdminDashboard />} />
          <Route path='create-bank-detail' element={<CreateBankDeatils />} />
          <Route path='bank-detail-list' element={<BankDetailsList />} />
          <Route path='programmes-card' element={<ProgrammesRegistrationCard />} />
          <Route path='programmes-calendar' element={<ProgrammesCalendar />} />
          <Route path='create-program' element={<ProgrammeRegistration />} />
          <Route path='candidate-registration/:P_Code' element={<CandidateRegistration />} />
          <Route path='edite-student/:StnAddNo' element={<EditeStudentRecord />} />
          <Route path='all-students' element={<OurStudentsList />} />
          <Route path='new-student' element={<StudentRegistration />} />
          <Route path='all-users' element={<AllUsersList />} />
          <Route path='all-wings-list' element={<AllWingsList />} />
          <Route path='create-wing' element={<CreateNewWing />} />
          <Route path='create-highlight' element={<CreateHighLight />} />
          <Route path='all-donation' element={<AllDonators />} />
          <Route path='create-treasurer' element={<CreateTreasurer />} />
          <Route path='all-treasurer-list' element={<AllTreasurerList />} />
          <Route path='economy-analytics' element={<ExpancesDetail />} />
        </Route>

        {/* STUDENT PANEL (Protected) */}
        <Route path='/student-panel/:actStn' element={
          <ProtectedRoute>
            <StudentPanel />
          </ProtectedRoute>
        }>
          <Route index element={<StudentDashBoard />} />
          <Route path='stn-dashboard' element={<StudentDashBoard />} />
          <Route path='all-programmes-list' element={<ProgrammesRegistrationCard />} />
          <Route path='candidate-registration/:P_Code' element={<CandidateRegistration />} />
          <Route path='stn-achievements-list' element={<StudentsAchievements />} />
          <Route path='stn-outreach-list' element={<StudentsOutReach />} />
          <Route path='stn-anylatics' element={<StudentAnalytics />} />
          <Route path='stn-program' element={<StudentProgrammes />} />
        </Route>

        {/* WING PANEL (Protected) */}
        <Route path='/wing-panel/:actWing' element={
          <ProtectedRoute>
            <WingPanel />
          </ProtectedRoute>
        }>
          <Route index element={<WingDashboard />} />
          <Route path='wing-dashboard' element={<WingDashboard />} />
          <Route path='create-result' element={<CreateResult />} />
          <Route path='create-program' element={<ProgrammeRegistration />} />
          <Route path='wing-anylatics' element={<WingAnylatics />} />
          <Route path='wing-programmes' element={<WingProgrammes />} />
          <Route path='wing-results' element={<WingResults />} />
        </Route>

        {/* OUTREACH PANEL (Protected) */}
        <Route path='/outreach-panel/:actOutReach' element={
          <ProtectedRoute>
            <OutReachPanel />
          </ProtectedRoute>
        }>
          <Route index element={<OutReachDashboard />} />
          <Route path='dashboard' element={<OutReachDashboard />} />
          <Route path='create-achievements' element={<CreateAchievements />} />
          <Route path='create-outreach' element={<CreateOutReach />} />
          <Route path='outreach-anaylatics' element={<OutReachAnaylatics />} />
          <Route path='edite-outreach' element={<OutReachAnaylatics />} />
          <Route path='edite-achievement/:Achieve_Id' element={<OutReachAnaylatics />} />
        </Route>

        {/* Treasurer PANEL (Protected) */}
        <Route path='/treasurer-panel/:actTreasurer' element={
          <ProtectedRoute>
            <TreasurerPanel />
          </ProtectedRoute>
        }>
          <Route index element={<TreasurerDashboard />} />
          <Route path='dashboard' element={<TreasurerDashboard />} />
          <Route path='create-expance' element={<CreateExpanceOrIncome />} />
          <Route path='treasurer-analytics' element={<TreasureAnalatics />} />
        </Route>

        {/* 404 ERROR PAGE (Catches all unknown URLs) */}
        <Route path='*' element={<NotFoundPage />} />
      </Routes>
    </>
  );
}