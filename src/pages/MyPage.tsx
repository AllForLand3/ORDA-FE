import { ProfileScreen } from '@/features/auth/components/ProfileScreen';
import { MyCoursesNavigation } from '@/features/course';
import './my-courses.css';

export function MyPage() {
  return <ProfileScreen navigation={<MyCoursesNavigation current={false} />} />;
}
