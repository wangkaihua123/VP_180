import Link from 'next/link';
import { useRouter } from 'next/router';
import { FileText, LayoutDashboard, PlayCircle, BarChart2, Settings, LogOut } from 'lucide-react';

alert('Sidebar loaded!');
console.log('Sidebar component loaded!');

const menu = [
  { label: '概览', icon: <LayoutDashboard size={20} />, path: '/' },
  { label: '测试用例', icon: <FileText size={20} />, path: '/test-cases' },
  { label: '测试执行', icon: <PlayCircle size={20} />, path: '/test-execution' },
  { label: '测试报告', icon: <BarChart2 size={20} />, path: '/test-report' },
  { label: '设置', icon: <Settings size={20} />, path: '/settings' },
];

export default function Sidebar() {
  const router = useRouter();
  return (
    <aside style={{
      width: 220,
      background: '#ff0', // 明显的黄色
      borderRight: '3px solid #f00', // 红色边框
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 9999, // 极高z-index
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ fontWeight: 600, fontSize: 18, padding: '32px 0 24px 32px', letterSpacing: 1 }}>测试专业</div>
      <nav style={{ flex: 1 }}>
        {menu.map(item => (
          <Link href={item.path} key={item.label} legacyBehavior>
            <a style={{
              display: 'flex', alignItems: 'center', padding: '12px 32px', color: router.pathname === item.path ? '#1677ff' : '#222', background: router.pathname === item.path ? '#f0f6ff' : 'transparent', fontWeight: router.pathname === item.path ? 600 : 400, textDecoration: 'none', fontSize: 16
            }}>
              {item.icon}
              <span style={{ marginLeft: 12 }}>{item.label}</span>
            </a>
          </Link>
        ))}
      </nav>
      <div style={{ padding: '24px 32px' }}>
        <a href="/logout" style={{ display: 'flex', alignItems: 'center', color: '#222', fontSize: 16, textDecoration: 'none' }}>
          <LogOut size={20} />
          <span style={{ marginLeft: 12 }}>退出登录</span>
        </a>
      </div>
    </aside>
  );
}