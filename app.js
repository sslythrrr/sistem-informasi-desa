const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const bcrypt = require('bcrypt');
const sharp = require('sharp');

const app = express();

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'desa_tegal'
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to database');
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(session({
  resave: false,
  saveUninitialized: true
}));

// Helper function to handle index page with optional section
function renderIndex(req, res, section = null) {
  const sql = 'SELECT id, judul, LEFT(isi, 100) AS isi_singkat, gambar, DATE_FORMAT(tanggal, "%W, %d %M %Y") AS formatted_date FROM berita ORDER BY tanggal DESC LIMIT 3';
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    } else {
      results.forEach(berita => {
        if (berita.gambar) {
          berita.gambar = berita.gambar.toString('base64');
        }
      });
      res.render('index', { 
        section: section, 
        isAdmin: req.session.isAdmin,
        berita: results 
      });
    }
  });
}

// Image compression function
async function compressImage(buffer, options = {}) {
  const {
    format = 'jpeg',
    quality = 80,
    width = 1000
  } = options;

  return sharp(buffer)
    .resize({ width, withoutEnlargement: true })
    [format]({ quality })
    .toBuffer();
}

// Routes
app.get('/', (req, res) => renderIndex(req, res));
app.get('/index', (req, res) => renderIndex(req, res));
app.get('/index#:section', (req, res) => renderIndex(req, res, req.params.section));

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', username);

  const sql = 'SELECT * FROM admin WHERE username = ?';
  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.json({ success: false, message: 'An error occurred' });
    }
    
    console.log('Query results:', results);

    if (results.length > 0) {
      const hashedPassword = results[0].password;
      console.log('Stored hashed password:', hashedPassword);
      console.log('Entered password:', password);

      // Gunakan fungsi custom untuk verifikasi
      const passwordMatch = verifyPassword(password, hashedPassword);
      console.log('Password match result:', passwordMatch);

      if (passwordMatch) {
        req.session.isAdmin = true;
        req.session.username = username;
        console.log('Login successful');
        res.json({ success: true, message: 'Login successful' });
      } else {
        console.log('Login failed: Incorrect password');
        res.json({ success: false, message: 'Incorrect username or password' });
      }
    } else {
      console.log('Login failed: User not found');
      res.json({ success: false, message: 'Incorrect username or password' });
    }
  });
});

function verifyPassword(password, hash) {
  // Implementasi manual untuk verifikasi bcrypt
  const bcrypt = require('bcryptjs'); // Gunakan bcryptjs sebagai alternatif
  return bcrypt.compareSync(password, hash);
}

app.get('/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

// Dashboard route
app.get('/admin/dashboard', (req, res) => {
  if (req.session.isAdmin) {
    res.render('admin_dashboard');
  } else {
    res.redirect('/');
  }
});

// Get galeri items
app.get('/admin/galeri', (req, res) => {
  const sql = 'SELECT id, title, galeri_img, kategori, created_at FROM galeri ORDER BY created_at DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      results.forEach(result => {
        if (result.galeri_img) {
          result.galeri_img = result.galeri_img.toString('base64');
        }
      });
      res.json(results);
    }
  });
});

// Add galeri item (with compression)
app.post('/admin/add-gallery', upload.single('image'), async (req, res) => {
  try {
    const { title, kategori } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const compressedImage = await compressImage(req.file.buffer, {
      format: 'jpeg',
      quality: 80,
      width: 1000
    });

    const sql = 'INSERT INTO galeri (title, galeri_img, kategori) VALUES (?, ?, ?)';
    db.query(sql, [title, compressedImage, kategori], (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.redirect('/admin/dashboard');
      }
    });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Error processing image' });
  }
});

// Delete galeri item
app.delete('/admin/delete-galeri/:id', (req, res) => {
  const sql = 'DELETE FROM galeri WHERE id = ?';
  db.query(sql, [req.params.id], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    } else {
      res.json({ success: true });
    }
  });
});

// Get pengumuman
app.get('/admin/pengumuman', (req, res) => {
  const sql = 'SELECT * FROM pengumuman ORDER BY created_at DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(results);
    }
  });
});

// Add announcement
app.post('/admin/add-announcement', (req, res) => {
  const { title, content } = req.body;
  const sql = 'INSERT INTO pengumuman (title, content) VALUES (?, ?)';
  db.query(sql, [title, content], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.redirect('/admin/dashboard');
    }
  });
});

// Delete announcement
app.delete('/admin/delete-pengumuman/:id', (req, res) => {
  const sql = 'DELETE FROM pengumuman WHERE id = ?';
  db.query(sql, [req.params.id], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    } else {
      res.json({ success: true });
    }
  });
});

// Get aspirasi
app.get('/admin/aspirasi', (req, res) => {
  const sql = 'SELECT * FROM aspirasi ORDER BY created_at DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(results);
    }
  });
});

// Get letters
app.get('/admin/letters', (req, res) => {
  const sql = 'SELECT * FROM surat ORDER BY created_at DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(results);
    }
  });
});

// Get berita
app.get('/admin/berita', (req, res) => {
  const sql = 'SELECT id, judul, LEFT(isi, 200) AS isi_singkat, tanggal FROM berita ORDER BY tanggal DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(results);
    }
  });
});

// Get single berita
app.get('/admin/berita/:id', (req, res) => {
  const sql = 'SELECT * FROM berita WHERE id = ?';
  db.query(sql, [req.params.id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      if (results.length > 0) {
        const berita = results[0];
        if (berita.gambar) {
          berita.gambar = berita.gambar.toString('base64');
        }
        res.json(berita);
      } else {
        res.status(404).json({ error: 'Berita not found' });
      }
    }
  });
});

app.get('/berita', (req, res) => {
  const sql = 'SELECT id, judul, LEFT(isi, 200) AS isi_singkat, gambar, tanggal FROM berita ORDER BY tanggal DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    } else {
      results.forEach(berita => {
        if (berita.gambar) {
          berita.gambar = berita.gambar.toString('base64');
        }
      });
      res.render('berita', { berita: results, isAdmin: req.session.isAdmin });
    }
  });
});

// Add berita (with compression)
app.post('/admin/add-berita', upload.single('gambar'), async (req, res) => {
  try {
    const { judul, isi } = req.body;
    let compressedImage = null;

    if (req.file) {
      compressedImage = await compressImage(req.file.buffer, {
        format: 'jpeg',
        quality: 80,
        width: 1000
      });
    }

    const sql = 'INSERT INTO berita (judul, isi, gambar) VALUES (?, ?, ?)';
    db.query(sql, [judul, isi, compressedImage], (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.redirect('/admin/dashboard');
      }
    });
  } catch (error) {
    console.error('Error processing berita:', error);
    res.status(500).json({ error: 'Error processing berita' });
  }
});

// Delete berita
app.delete('/admin/delete-berita/:id', (req, res) => {
  const sql = 'DELETE FROM berita WHERE id = ?';
  db.query(sql, [req.params.id], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    } else {
      res.json({ success: true });
    }
  });
});

app.get('/berita/:id', (req, res) => {
  const sql = 'SELECT * FROM berita WHERE id = ?';
  db.query(sql, [req.params.id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    } else {
      if (results.length > 0) {
        const berita = results[0];
        if (berita.gambar) {
          berita.gambar = berita.gambar.toString('base64');
        }
        res.render('berita-detail', { berita: berita, isAdmin: req.session.isAdmin });
      } else {
        res.status(404).send('Berita not found');
      }
    }
  });
});

// Other pages
app.get('/sejarah', (req, res) => {
  res.render('sejarah', { isAdmin: req.session.isAdmin });
});

app.get('/visimisi', (req, res) => {
  res.render('visimisi', { isAdmin: req.session.isAdmin });
});

app.get('/struktur', (req, res) => {
  res.render('struktur', { isAdmin: req.session.isAdmin });
});

app.get('/demografi', (req, res) => {
  res.render('demografi', { isAdmin: req.session.isAdmin });
});

app.get('/kontak', (req, res) => {
  res.render('kontak', { isAdmin: req.session.isAdmin });
});

// Pengajuan surat
app.get('/pengajuansurat', (req, res) => {
  res.render('pengajuansurat', { isAdmin: req.session.isAdmin });
});

app.post('/pengajuansurat', (req, res) => {
  const { nama, perihal, staf, telepon, keterangan } = req.body;
  const sql = 'INSERT INTO surat (nama, perihal, staf, telepon, keterangan) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [nama, perihal, staf, telepon, keterangan], (err, result) => {
    if (err) throw err;
    res.redirect('/pengajuansurat');
  });
});

// Aspiration routes
app.get('/aspirasi', (req, res) => {
  res.render('aspirasi', { isAdmin: req.session.isAdmin });
});

app.post('/aspirasi', (req, res) => {
  const { name, email, message } = req.body;
  const sql = 'INSERT INTO aspirasi (name, email, message) VALUES (?, ?, ?)';
  db.query(sql, [name, email, message], (err, result) => {
    if (err) throw err;
    res.redirect('/aspirasi');
  });
});

// galeri routes
app.get('/galeri', (req, res) => {
  const sql = 'SELECT id, title, galeri_img, kategori FROM galeri ORDER BY created_at DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    } else {
      results.forEach(result => {
        if (result.galeri_img) {
          result.galeri_img = result.galeri_img.toString('base64');
        }
      });
      res.render('galeri', { images: results, isAdmin: req.session.isAdmin });
    }
  });
});

//galeri categories
app.get('/galeri/categories', (req, res) => {
  const sql = 'SELECT DISTINCT kategori FROM galeri';
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      const categories = results.map(row => row.kategori);
      res.json(categories);
    }
  });
});

// Announcement routes
app.get('/pengumuman', (req, res) => {
  const sql = 'SELECT * FROM pengumuman ORDER BY created_at DESC';
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.render('pengumuman', { pengumuman: results, isAdmin: req.session.isAdmin });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
