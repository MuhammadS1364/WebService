/**
 * Comprehensive TypeScript Database Models for Anjuman e Huda Management Portal
 */

export interface UserRecord {
  UserEmail: string;
  UserRole: "Admin" | "Wing" | "Student" | "Treasurer" | "OutReach" | string;
  UserPassword?: string;
  IsActive?: boolean;
  IsAuthenticated?: boolean;
  UserId?: string;
}

export interface StudentRecord {
  AddNo: string;
  StudentName: string;
  StudentEmail: string;
  FatherName?: string;
  CollegeName?: string;
  StnUserId?: string;
  Class?: string;
  Stn_Class?: string;
  Registration_Count?: number;
  Resluted_Count?: number;
  Total_Point_Anjuman?: number;
  OutReach_Count?: number;
  OutReach_Points?: number;
  Achievements_Counts?: number;
  Achievements_Points?: number;
  Grand_Total_Points?: number;
  IsActive?: boolean;
  Student_Photo_Urls?: string;
  StnState?: string;
  StnDistrict?: string;
}

export interface WingRecord {
  WingCode: string;
  WingTitle: string;
  WingEmail?: string;
  WingManager?: string;
  WingConvener?: string;
  WingAssistant?: string;
  Total_Registrations?: number;
  Total_Resulted?: number;
  Total_Points?: number;
  Bonus_Points?: number;
  Description?: string;
  WingUserId?: string;
  IsActive?: boolean;
}

export interface ProgrammeRecord {
  Program_Title: string;
  Program_Code: string;
  WingCode?: string;
  Description?: string;
  OutComes?: string;
  Date?: string;
  Venue?: string;
  Category?: string;
  Group?: string;
  IsApproved?: boolean;
  IsResulted?: boolean;
  IsResultPublished?: boolean;
  Total_Registration?: number;
  IsOpenRegistration?: boolean;
  Program_Poster?: string;
  IsConducted?: boolean;
  AccademicYear?: string;
  created_at?: string;
  Expected_Time?: string;
  Collaborator?: string;
  is_group_program?: boolean; // Group programme flag
}

export interface ResultRecord {
  Result_id: string;
  creaded_At?: string;
  Program_Id: string;
  First_Holder?: string;
  Second_Holder?: string;
  Third_Holder?: string;
  AGrade?: string;
  BGrade?: string;
}

export interface CandidateRegistrationRecord {
  CandidateUUiD: string;
  Program_Code: string | null;
  Candidate_Code: string | null;
  squad_uuid?: string | null;
}

export interface StudentAchievementRecord {
  Achieve_Id: string;
  Achiever_Name?: string;
  Achievement_Title?: string;
  Achievement_Type?: string;
  Position_Achieved?: string;
  Achieve_Descriptin?: string;
  Point_Obtained?: number;
  StnAddNo?: string;
}

export interface StudentOutReachRecord {
  OutReach_Id: string;
  created_at?: string;
  OutReach_Holder?: string;
  OutReach_Title?: string;
  OutReach_Type?: string;
  Position_Achieved?: string;
  OutReach_Descriptin?: string;
  Point_Obtained?: number;
  StnAddNo?: string;
}

export interface TreasurerRecord {
  Treasurer_id: string;
  created_at?: string;
  Treasurer_UserId?: string;
  Treasurer_Name?: string;
  Treasurer_Email?: string;
  AccountingFor?: string;
  IsActive?: boolean;
}

export interface PublicHighlightRecord {
  id: number;
  created_at?: string;
  HighLitght_Title?: string;
  HighLight_Type?: string;
  PhotoImg_Url?: string;
  ShortDescpt?: string;
  Accademic_Year?: number;
  FileType?: string;
}

export interface EconomicalRecord {
  Economy_id: string;
  created_at?: string;
  forwhat?: string;
  how_mach?: number;
  Whom_Gave?: string;
  Date?: string;
  Method?: string;
  Income_Outcome?: string;
  Treasurer_Email?: string;
  AcademicYear?: string;
}

export interface DonationRecord {
  Donner_id: string;
  created_at?: string;
  Donator_Name?: string;
  Donator_Place?: string;
  DonationAmnts?: number;
  DonationYear?: number;
  FeedBack?: string;
  PayMentType?: string;
}

export interface BankDetailsRecord {
  Deati_id: string;
  created_at?: string;
  Bank_Holde_Name?: string;
  Account_Number?: string;
  UPi_Number?: string;
  PaY_Qr_Photo?: string;
  IsActive?: boolean;
}

/**
 * Feedback for conducted programmes submitted by participating students or public guests
 */
export interface ProgrammeFeedbackRecord {
  feedback_id?: string;
  created_at?: string;
  student_uuid?: string | null; // references StudentsBox.AddNo (null for external/public guests)
  program_uuid: string; // references ProgrammesBox.Program_Code
  feed_text?: string;
  rating_stars?: number;
  is_public_feedback?: boolean;
  public_feeder_name?: string | null;
}

/**
 * Squad for group programmes: build a squad of up to 7 students
 */
export interface SquadMateRecord {
  squad_id?: string;
  created_at?: string;
  squad_title: string;
  member1_uuid: string; // references StudentsBox.AddNo
  member2_uuid?: string;
  member3_uuid?: string;
  member4_uuid?: string;
  member5_uuid?: string;
  member6_uuid?: string;
  member7_uuid?: string;
  is_active?: boolean;
  total_particiations?: number;
  is_suspented?: boolean;
  total_points?: number;
  winning_rate?: number;
}

/**
 * Updated ProgrammesBox Record Type
 */
export interface ProgrammesBoxRecord {
  Program_Title: string | null;
  Program_Code: string;
  WingCode: string | null;
  Description: string | null;
  OutComes: string | null;
  Date: string | null;
  Group: string | null;
  IsApproved: boolean | null;
  IsResulted: boolean | null;
  IsResultPublished: boolean | null;
  Total_Registration: number | null;
  IsOpenRegistration: boolean | null;
  Program_Poster: string | null;
  IsConducted: boolean | null;
  created_at?: string | null;
  Expected_Time: string | null;
  Collaborator: string | null;
  is_group_program: boolean | null;
  Venue: string | null; // uuid references Our_Venues(venue_id)
  Category: string | null; // uuid references Our_Category(category_id)
  AccademicYear: string | null; // uuid references Accademic_Info(accademic_id)
  points_template: string | null; // uuid references Points_Templates(p_template_id)
  isContentRequired?: boolean;
  ContentSubmition_deadLine?: string | null;
}

/**
 * Groups Table (Our_Groups)
 */
export interface OurGroupsRecord {
  group_id: string;
  created_at?: string;
  group_title?: string | null;
  short_dec?: string | null;
  is_active?: boolean | null;
}

/**
 * Category Table
 */
export interface OurCategoryRecord {
  category_id: string;
  created_at?: string;
  category_title: string;
  class_1?: string | null;
  class_2?: string | null;
  class_3?: string | null;
  is_active?: boolean;
}

/**
 * Batches Table (Our_Batches)
 */
export interface OurBatchesRecord {
  batch_id: string;
  created_at?: string;
  batch_name: string;
  batch_president?: string | null;
  batch_secratery?: string | null;
  batch_joint_secratery?: string | null;
  batch_treasurer?: string | null;
  batch_logo?: string | null;
  is_active?: boolean;
}

/**
 * Classes Table (Our_Classes)
 */
export interface OurClassesRecord {
  class_id: string;
  created_at?: string;
  class_serial_number?: number;
  total_student?: number;
  is_active?: boolean;
  batch_uuid?: string | null;
  class_nick_name?: string | null;
  standard_name: string;
}

/**
 * Content Submission Table (Content_Table)
 */
export interface ContentTableRecord {
  content_id: string;
  created_at?: string;
  content_title?: string | null;
  programe_code?: string | null;
  student_addNo?: string | null;
  like_count?: number | null;
  content_text?: string | null;
  content_file?: string | null;
}

/**
 * Academic Year Info Table
 */
export interface AccademicInfoRecord {
  accademic_id: string;
  created_at?: string;
  accademic_president?: string;
  accademic_secratery?: string;
  accademic_treasurer?: string;
  accademic_pro?: string;
  accademic_voice_president?: string;
  accademic_joint_secratery?: string;
  accademic_year?: string;
  is_active?: boolean;
  accademic_title?: string;
  total_count_program?: number;
  total_resulted?: number;
  total_prize_distributed?: number;
}

/**
 * Venues Table
 */
export interface OurVenuesRecord {
  venue_id: string;
  created_at?: string;
  venue_title: string;
  venue_capacity?: number;
  is_active?: boolean;
}

/**
 * Points Templates Table
 */
export interface PointsTemplateRecord {
  p_template_id: string;
  created_at?: string;
  point_template_title: string;
  first_only?: number;
  second_only?: number;
  third_only?: number;
  first_A_grade?: number;
  first_B_grade?: number;
  second_A_grade?: number;
  second_B_grade?: number;
  third_A_grade?: number;
  third_B_grade?: number;
  A_grade?: number;
  B_grade?: number;
}

/**
 * ResultBox Table
 */
export interface ResultBoxRecord {
  Result_id: string;
  creaded_At?: string | null;
  Program_Id: string | null;
  First_Holder: string | null;
  Second_Holder: string | null;
  Third_Holder: string | null;
  AGrade: string | null;
  BGrade: string | null;
}
