import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '../../components/Navbar';
import { FaEye } from 'react-icons/fa';
import './Manageqr.css';

// === MODALs giữ nguyên ===
const FrameImageModal = ({ isOpen, onClose, imageUrl }) => {
  if (!isOpen) return null;
  return (
    <div className="manageqr-modal-overlay" onClick={onClose}>
      <div className="manageqr-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="manageqr-modal-close-btn" onClick={onClose}>×</button>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Khung ảnh"
            className="manageqr-frame-image"
            onError={() => alert('Không hiển thị được ảnh khung. Định dạng không hợp lệ.')}
          />
        ) : (
          <p>Không có dữ liệu ảnh khung.</p>
        )}
      </div>
    </div>
  );
};

const QRModal = ({ isOpen, onClose, qrImage, qrLink }) => {
  if (!isOpen) return null;
  return (
    <div className="manageqr-modal-overlay" onClick={onClose}>
      <div className="manageqr-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="manageqr-modal-close-btn" onClick={onClose}>×</button>
        {qrImage ? (
          <img
            src={qrImage}
            alt="Mã QR"
            className="manageqr-qr-image"
            onError={() => alert('Không tải được mã QR.')}
          />
        ) : (
          <div className="manageqr-qr-placeholder">Đang tải QR...</div>
        )}
        {qrLink && (
          <div className="manageqr-qr-link">
            <p>
              Link: <a href={qrLink} target="_blank" rel="noopener noreferrer">{qrLink}</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// === COMPONENT CHÍNH ===
const Manageqr = () => {
  // === Auth ===
  const getAuth = () => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : null;
  };
  const [auth, setAuth] = useState(getAuth());
  const { id: id_admin, username } = auth || {};

  // === UI State ===
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  // === Dữ liệu đơn hàng ===
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // === Dữ liệu top khung ảnh ===
  const [topFrames, setTopFrames] = useState([]);
  const [loadingTopFrames, setLoadingTopFrames] = useState(true);

  // === Tìm kiếm & lọc ===
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  // === Phân trang ===
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // === Modal states ===
  const [isFrameModalOpen, setIsFrameModalOpen] = useState(false);
  const [frameImageUrl, setFrameImageUrl] = useState('');

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [qrLink, setQrLink] = useState('');

  // === LẤY ĐƠN HÀNG ===
  const fetchOrders = async () => {
    if (!id_admin) {
      setLoading(false);
      setError('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/get-orders?id_admin=${id_admin}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Lỗi ${res.status}: ${text.substring(0, 100)}`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('Dữ liệu không hợp lệ');
      setOrders(data);
      setError(null);
    } catch (err) {
      console.error('Lỗi tải đơn hàng:', err);
      setError('Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // === LẤY TOP KHUNG ẢNH ===
  const fetchTopFrames = async () => {
    if (!id_admin) {
      setLoadingTopFrames(false);
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/top-frames?id_admin=${id_admin}`);
      if (!res.ok) {
        const text = await res.text();
        console.error('Lỗi API top-frames:', text);
        throw new Error('Không thể tải top khung ảnh');
      }
      const data = await res.json();
      if (Array.isArray(data.data)) {
        setTopFrames(data.data);
      } else {
        setTopFrames([]);
      }
    } catch (err) {
      console.error('Lỗi khi tải top khung ảnh:', err);
      setTopFrames([]);
      alert('Không thể tải danh sách khung ảnh phổ biến.');
    } finally {
      setLoadingTopFrames(false);
    }
  };

  // === Gọi API khi id_admin thay đổi ===
  useEffect(() => {
    fetchOrders();
    fetchTopFrames();
  }, [id_admin]);

  // === LỌC & TÌM KIẾM ===
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    result = result.filter(order => {
      const orderDateStr = (order.time || '').split(' ')[0];
      if (!orderDateStr) return false;

      if (dateFilter === 'today') return orderDateStr === today;
      if (dateFilter === 'month') return orderDateStr.startsWith(currentMonth);
      return true;
    });

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(order =>
        String(order.id).includes(term) ||
        (order.discount_code || '').toLowerCase().includes(term) ||
        (order.time || '').toLowerCase().includes(term)
      );
    }

    return result;
  }, [orders, dateFilter, searchTerm]);

  // === PHÂN TRANG ===
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, searchTerm]);

  // === Handler ===
  const handleViewFrame = async (frameId) => {
    if (!frameId) {
      alert('Không có khung để hiển thị.');
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/frame-image?id=${frameId}`);
      if (!res.ok) throw new Error('Không tìm thấy khung ảnh');
      const data = await res.json();
      if (data.image_url) {
        setFrameImageUrl(data.image_url);
        setIsFrameModalOpen(true);
      } else {
        alert('Dữ liệu khung ảnh trống.');
      }
    } catch (err) {
      console.error('Lỗi tải khung:', err);
      alert('Không thể tải khung ảnh.');
    }
  };

  const handleViewQR = async (sessionId) => {
    if (!sessionId) {
      alert('Không có mã QR để hiển thị.');
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/qr-image?session_id=${sessionId}`);
      if (!res.ok) throw new Error('Không tìm thấy mã QR');
      const data = await res.json();
      if (data.qr_image_url) {
        setQrImageUrl(data.qr_image_url);
        setQrLink(data.qr_link || '');
        setIsQRModalOpen(true);
      } else {
        alert('Không có dữ liệu mã QR.');
      }
    } catch (err) {
      console.error('Lỗi tải QR:', err);
      alert('Không thể tải mã QR.');
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <>
      <Navbar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        id={id_admin}
        username={username}
      />

      <div className={`manageqr-main-container ${sidebarCollapsed ? 'manageqr-sidebar-collapsed' : ''}`}>
        <div className='manageqr-gap'>
          <h2 className="manageqr-title">Danh Sách Đơn Chụp</h2>
        </div>

        <div className="manageqr-header-with-filter">
          <div className="manageqr-filters">
            <div className="manageqr-search">
              <input
                type="text"
                placeholder="Tìm theo ID, mã giảm giá, thời gian..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="manageqr-search-input"
              />
            </div>
            <div className="manageqr-date-filter">
              <label>Thời gian:</label>
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                <option value="all">Tất cả</option>
                <option value="today">Hôm nay</option>
                <option value="month">Tháng này</option>
              </select>
            </div>
          </div>
        </div>

        {error && <div className="manageqr-error">{error}</div>}

        {/* GRID 2 CỘT */}
        <div className="manageqr-content-grid">
          {/* CỘT TRÁI: ĐƠN HÀNG */}
          <div className="manageqr-orders-section">
            {loading ? (
              <div className="manageqr-loading">Đang tải dữ liệu...</div>
            ) : (
              <>
                <div className='manageqr-table-wrapper'>
                  <table className="manageqr-order-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Mã giảm giá</th>
                        <th>Thời gian</th>
                        <th>Khung ảnh</th>
                        <th>Mã QR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrders.length > 0 ? (
                        paginatedOrders.map(order => (
                          <tr key={order.id}>
                            <td>{order.id}</td>
                            <td>{order.discount_code || '—'}</td>
                            <td>{order.time}</td>
                            <td>
                              <button
                                className="manageqr-btn manageqr-btn-frame"
                                onClick={() => handleViewFrame(order.frame_id)}
                                disabled={!order.frame_id}
                              >
                                <FaEye />
                              </button>
                            </td>
                            <td>
                              <button
                                className="manageqr-btn manageqr-btn-qr"
                                onClick={() => handleViewQR(order.qr_id)}
                                disabled={!order.qr_id}
                              >
                                <FaEye />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="manageqr-no-data">Không có dữ liệu.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="manageqr-pagination">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="manageqr-pagination-btn"
                    >
                      <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => goToPage(i + 1)}
                        className={`manageqr-pagination-btn ${currentPage === i + 1 ? 'manageqr-pagination-active' : ''}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="manageqr-pagination-btn"
                    >
                      <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* CỘT PHẢI: TOP KHUNG ẢNH */}
          <div className="manageqr-top-frames-section">
            <h3 className="manageqr-top-frames-title">Top 5 Khung Ảnh Phổ Biến</h3>
            {loadingTopFrames ? (
              <div className="manageqr-loading">Đang tải...</div>
            ) : topFrames.length > 0 ? (
              <div className="manageqr-top-frames-table-wrapper">
                <table className="manageqr-top-frames-table">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Khung ảnh</th>
                      <th>Số lần chụp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topFrames.map((item, index) => (
                      <tr key={item.id_frame}>
                        <td>{index + 1}</td>
                        <td>
                          {item.frame ? (
                            <img
                              src={item.frame}
                              alt={`Khung ${item.id_frame}`}
                              className="manageqr-top-frame-preview"
                              onError={(e) => {
                                e.target.alt = 'Ảnh lỗi';
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="manageqr-no-image">—</span>
                          )}
                        </td>
                        <td>{item.usage_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="manageqr-no-data" style={{ textAlign: 'center', marginTop: '12px' }}>
                Chưa có dữ liệu khung ảnh.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      <FrameImageModal
        isOpen={isFrameModalOpen}
        onClose={() => {
          setIsFrameModalOpen(false);
          setFrameImageUrl('');
        }}
        imageUrl={frameImageUrl}
      />

      <QRModal
        isOpen={isQRModalOpen}
        onClose={() => {
          setIsQRModalOpen(false);
          setQrImageUrl('');
          setQrLink('');
        }}
        qrImage={qrImageUrl}
        qrLink={qrLink}
      />
    </>
  );
};

export default Manageqr;