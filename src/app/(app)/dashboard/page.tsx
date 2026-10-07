import {getAuthUser,requireUser} from '@/server/auth';
import {getDashboard} from '@/server/daily';
import {getSkillSummary} from '@/server/analytics';
import {homeData} from '@/server/home';
import {publicStatsForPage} from '@/server/public-stats';
import {latestActivePracticeSession} from '@/server/practice-sessions';
import {DashboardView} from './dashboard-view';
import {safely} from '@/lib/safely';
export const metadata={title:'Home'};
export default async function DashboardPage(){
 const [{userId,profile},user]=await Promise.all([requireUser(),getAuthUser()]);
 const [d,summary,home,community,savedPractice]=await Promise.all([
  getDashboard(userId,profile),getSkillSummary(userId),homeData(userId),
  publicStatsForPage(),safely(()=>latestActivePracticeSession(userId),null),
 ]);
 return <DashboardView {...{profile,user,d,summary,home,community,savedPractice}}/>;
}
