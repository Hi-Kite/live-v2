# Place your SSL certs here (gitignored):
#   fullchain.pem
#   privkey.pem
#
# Quick self-signed for testing (browser will warn):
#   openssl req -x509 -newkey rsa:2048 -nodes -days 365 \
#     -keyout privkey.pem -out fullchain.pem \
#     -subj "/CN=localhost"
#
# Production: use Let's Encrypt. Get certs on the host then copy here, OR
# run certbot standalone on port 80 (stop nginx first).
