((window) => {

    const baseUrl = '<%= baseUrl %>',
          recaptchaKey = '<%= recaptcha %>',
          maxLife = parseInt('<%= maxLifeMs %>', 10);

    const save_token = (authJson) => {
            const exp = new Date(Date.now() + authJson.lifetime);
            sessionStorage.setItem('token', authJson.token);
            sessionStorage.setItem('exp', exp);
          },
          load_token = () => { 
            const token = sessionStorage.getItem('token'),
                  exp = new Date(sessionStorage.getItem('exp')),
                  rem = Math.max(0, exp.getTime() - Date.now()),
                  pc = (rem * 100 / maxLife).toFixed(2) + '%';
            return rem > 0 ? { token, exp, rem, pc, tot: maxLife } : { rem, pc, tot: maxLife };
          },
          wipe_token = () => {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('exp');
          }

    const empty = (elem) => { while (elem.firstChild) elem.removeChild(elem.firstChild); },
          remove = (elem) => { if (elem && elem.parentNode) elem.parentNode.removeChild(elem); },
          q2a = (q, parent) => Array.from((parent || document).querySelectorAll(q)),
          q2f = (q, parent) => (parent || document).querySelector(q),
          show_modal = (classname) => q2a('.modal')
            .filter(m => {
                if (m.parentElement instanceof HTMLBodyElement) m.classList.remove('open');
                return true;
            })
            .filter(m => m.classList.contains(classname))
            .filter(m => {
                empty(q2f('.errors', m));
                m.classList.add('open');
                const firstInput = q2f('textarea, input', m);
                if (firstInput) firstInput.focus();
                return true;
            })[0];

    const clear = (modal) => {
        q2a('input:not([type=button]), select, textarea', modal).forEach(ctrl => ctrl.value = '');
        q2a('[type=checkbox], [type=radio]', modal).forEach(ctrl => ctrl.checked = false);
        empty(q2f('.errors', modal));
    };

    const set_enabled = (modal, enable) => {

        q2a('input, select, textarea', modal).forEach(ctrl => {
            if (enable === true) { 
                ctrl.classList.remove('disabled');
                ctrl.removeAttribute('disabled');
            } else {
                ctrl.classList.add('disabled');
                ctrl.setAttribute('disabled', '');
            }
        });  
    };

    async function svc(secure, path, method, json) {

        const url = `${baseUrl}/${path}`,
              headers = { 'content-type': 'application/json' },
              body = JSON.stringify(json);

        if (secure === true) {

            const authJson = load_token();
            console.log('UPDATE LIFETIME (Service Call)', authJson.pc);

            headers['authorization'] = `Bearer ${authJson.token}`;
        }

        const response = await fetch(url, { method, headers, body }),
              resultjson = await response.json();

        if (response.status === 401 && secure === true) {
            q2f('body').classList.remove('auth');
            return obtain_login(true)
                .then(() => svc(secure, path, method, json));
        }
        else if (!response.ok) {
            throw resultjson;
        }

        if (secure === true) {
            q2f('body').classList.add('auth');
        }

        return resultjson;
    }

    function obtain_login(fresh) {
        
        return new Promise(resolve => {

            if (fresh === true) wipe_token();
            else {
                const authJson = load_token();
                console.log('UPDATE LIFETIME (Login)', authJson.pc);

                if (authJson.token && authJson.exp > Date.now()) {
                    // assume auth granted
                    q2f('body').classList.add('auth');
                    return resolve();
                }
            }

            const modal = show_modal('login'),
                  errors = q2f('.errors', modal);

            q2f('[type=button]', modal).onclick = () => {

                empty(errors);
                set_enabled(modal, false);

                const password = q2f('[placeholder=password]', modal).value,
                      username = q2f('[placeholder=username]', modal).value;

                if (!window.grecaptcha) {
                    errors.textContent = 'Recaptcha error. Blame google :P';
                    return set_enabled(modal, true);
                }

                // obtain recaptcha token for server-side verification
                grecaptcha.execute(recaptchaKey, {action: 'login'})
                    .then(recaptcha => svc(false, 'login', 'POST', { username, password, recaptcha })
                        .then(authJson => {
                            save_token(authJson);
                            modal.classList.remove('open');
                            q2f('body').classList.add('auth');
                            clear(modal);
                            return resolve();
                        })
                        .catch(err => {
                            errors.innerHTML = err.detail
                                ? err.detail.join('<br>')
                                : err.message || err;
                        })
                        .finally(() => set_enabled(modal, true))
                    );
            }
        });
    }

    function obtain_registration() {

        return new Promise(resolve => {

            const modal = show_modal('register'),
                  errors = q2f('.errors', modal);

            q2f('[type=button]', modal).onclick = () => {

                empty(errors);
                set_enabled(modal, false);

                const password = q2f('[placeholder=password]', modal).value,
                      username = q2f('[placeholder=username]', modal).value;

                if (!window.grecaptcha) {
                    errors.textContent = 'Recaptcha error. Blame google :P';
                    return set_enabled(modal, true);
                }

                // obtain recaptcha token for server-side verification
                grecaptcha.execute(recaptchaKey, {action: 'register'})
                    .then(recaptcha => svc(false, 'user', 'POST', { username, password, recaptcha })
                        .then(authJson => {
                            save_token(authJson);
                            modal.classList.remove('open');
                            q2f('body').classList.add('auth');
                            clear(modal);
                            return resolve();
                        })
                        .catch(err => {
                            errors.innerHTML = err.detail
                                ? err.detail.join('<br>')
                                : err.message || err;
                        })
                        .finally(() => set_enabled(modal, true))
                    );
            }
        });
    }

    /*function obtain_add_edit_account(existing) {

        return new Promise(resolve => {

            const modal = show_modal('edit-account'),
                  txtErrors = q2f('.errors', modal),
                  chkTosAgreed = q2f('#agree-tos', modal),
                  chkIsTest = q2f('#test-mode', modal),
                  txtEmails = q2f('[placeholder=emails]', modal),
                  btnDelete = q2f('#delete-account', modal),
                  isUpdating = existing && existing.accountId,
                  accountId = isUpdating ? existing.accountId : null;

            clear(modal);
            chkTosAgreed.disabled = isUpdating;
            chkIsTest.disabled = isUpdating;
            btnDelete.classList.add('hide');

            if (isUpdating) {
                chkTosAgreed.checked = existing.accountId;
                chkIsTest.checked = existing.isTest;
                txtEmails.value = existing.emails.join('\r\n');
                btnDelete.classList.remove('hide');
                btnDelete.onclick = (event) => {
                    event.stopPropagation();
                    if (confirm('You are about to permanently delete the account and all associated orders. This action cannot be undone. Continue?')) {
                        svc(true, `account/${existing.accountId}`, 'DELETE')
                            .then(() => {
                                modal.classList.remove('open');
                                list_accounts();
                            })
                            .catch(err => {
                                txtErrors.innerHTML = err.detail
                                    ? err.detail.join('<br>')
                                    : err.message || err;
                                });
                    }
                }
            }

            q2f('[type=button]', modal).onclick = () => {

                empty(txtErrors);
                set_enabled(modal, false);

                const svc_verb = isUpdating ? 'PUT' : 'POST',
                      emails = txtEmails.value
                        .split(/[\s,;]/g)
                        .filter(a => a.length !== 0);
                   
                svc(true, 'account', svc_verb, { accountId, emails, tosAgreed: chkTosAgreed.checked, isTest: chkIsTest.checked })
                    .then(json => {
                        modal.classList.remove('open');
                        return resolve(json);
                    })
                    .catch(err => {
                        txtErrors.innerHTML = err.detail
                            ? err.detail.join('<br>')
                            : err.message || err;
                    })
                    .finally(() => set_enabled(modal, true));
            }
        });
    }

    function obtain_add_order(accountId) {

        return new Promise(resolve => {

            const modal = show_modal('add-order'),
                  errors = q2f('.errors', modal);

            clear(modal);
            q2f('[type=button]', modal).onclick = () => {

                empty(errors);
                set_enabled(modal, false);

                const domains = q2f('[placeholder=domains]', modal).value
                        .split(/[\s,;]/g)
                        .filter(a => a.length !== 0);
                        
                svc(true, 'order', 'POST', { accountId, domains })
                    .then(json => {
                        modal.classList.remove('open');
                        return resolve(json);
                    })
                    .catch(err => {
                        errors.innerHTML = err.detail
                            ? err.detail.map(d => d.message || d).join('<br>')
                            : err.message || err;
                    })
                    .finally(() => set_enabled(modal, true));
            }
        });
    }

    function obtain_edit_order(orderMeta) {

        return new Promise(resolve => {

            const modal = show_modal('edit-order'),
                  cmbDomains = q2f('select.domain', modal),
                  submitChallenge = q2f('#submit-challenge', modal),
                  materials = q2f('.materials', modal),
                  challengeDesc = q2f('.challenge-desc', modal),
                  errors = q2f('.errors', modal);

            empty(errors);
            clear(modal);
            modal.removeAttribute('data-status');
            modal.removeAttribute('data-sub-status');
            modal.classList.add('loading');

            svc(true, `order/${orderMeta.orderId}`, 'GET')
                .then(order => {
                    
                    // Received order data
                    modal.setAttribute('data-status', order.status);
                    const expiresFmt = new Date(order.expires).toLocaleDateString();
                    q2a('.expires', modal).forEach(d => d.textContent = 'Expires ' + expiresFmt);

                    switch (order.status) {

                        case 'invalid':
                            const renewOrder = q2f('#renew-order', modal);
                            renewOrder.onclick = () => {
                                modal.classList.add('loading');
                                svc(true, `order/${order.orderId}`, 'DELETE')
                                    .then(() => {
                                        svc(true, 'order', 'POST', { accountId: orderMeta.accountId, domains: orderMeta.domains })
                                            .then(json => { 
                                                resolve(json);
                                                orderMeta.orderId = json.orderId;
                                                obtain_edit_order(orderMeta).then(list_accounts);
                                            })
                                            .finally(() => modal.classList.remove('loading'))
                                    })
                                    .catch(err => {
                                        console.error(err);
                                        modal.classList.remove('loading');
                                    });
                            };
                            break;

                        case 'ready':
                            const finaliseOrder = q2f('#finalise-order', modal);
                            finaliseOrder.onclick = () => {       
                                modal.classList.add('loading');

                                svc(true, `order/${order.orderId}/finalise`, 'PUT')
                                    .then(() => obtain_edit_order(orderMeta).then(list_accounts))
                                    .finally(() => modal.classList.remove('loading'));
                            };
                            break;

                        case 'valid':
                            const downloader = q2f('.downloader', modal),
                                  cmbCertTypes = q2f('select.cert-type', modal),
                                  certTypeChange = (event) => modal.setAttribute('data-cert-type', event.target.value);

                            cmbCertTypes.onchange = certTypeChange;
                            cmbCertTypes.value = cmbCertTypes.options[0].value;
                            certTypeChange({ target: cmbCertTypes });

                            const downloadCert = q2f('#download-cert', modal);
                            downloadCert.onclick = () => {
                                
                                modal.classList.add('loading');
                                const certType = cmbCertTypes.value;
                                let getCertUrl = `order/${order.orderId}/cert/${order.certCode}/${certType}`;

                                if (certType === 'pfx') {
                                    const password = q2f('input[placeholder=password]', modal).value,
                                          friendlyName = q2f('input[placeholder="friendly name"]', modal).value;
                                    getCertUrl += ('/' + encodeURIComponent(password || ' '));
                                    getCertUrl += ('/' + encodeURIComponent(friendlyName || ' '));
                                }
                                
                                svc(true, getCertUrl, 'GET')
                                    .then(json => {
                                        downloader.setAttribute('download', `cert-${order.orderId}.${certType}`);
                                        downloader.setAttribute('href', `data:${json.contentType};charset=utf-8;base64,${json.base64}`);
                                        downloader.click();
                                    })
                                    .finally(() => modal.classList.remove('loading'));
                            };
                            break;

                        case 'pending':
                            // reset domains drop down
                            empty(cmbDomains);
                            let iter_option;
                            orderMeta.domains.forEach(domain => {
                                iter_option = document.createElement('option');
                                iter_option.value = domain;
                                iter_option.textContent = domain;
                                cmbDomains.appendChild(iter_option);
                            });
                            cmbDomains.value = orderMeta.domains[0];
                            cmbDomains.disabled = orderMeta.domains.length <= 1;
                            
                            const domainChange = (event) => {
                                const domainName = event.target.value,
                                      domainClaim = order.domainClaims.filter(dc => {
                                        const iter_name = dc.wildcard ? `*.${dc.domain}` : dc.domain;
                                        return iter_name === domainName;
                                      })[0];
                                
                                // Received domain data
                                modal.setAttribute('data-sub-status', domainClaim.status);
        
                                empty(errors);
                                const cmbChallenges = q2f('select.challenge', modal);
                                
                                // reset domains drop down
                                empty(cmbChallenges);
                                let iter_chall;
                                domainClaim.challenges.forEach(c => {
                                    iter_chall = document.createElement('option');
                                    iter_chall.value = c.type;
                                    iter_chall.textContent = c.type;
                                    iter_chall.setAttribute('data-challenge-id', c.challengeId);
                                    iter_chall.setAttribute('data-order-id', order.orderId);
                                    iter_chall.setAttribute('data-key-auth', c.keyAuth);
                                    iter_chall.setAttribute('data-auth-code', c.authCode);
                                    cmbChallenges.appendChild(iter_chall);
                                });
                                cmbChallenges.value = domainClaim.challenges[0].type;
                                cmbChallenges.disabled = domainClaim.challenges.length <= 1;
        
                                const challengeChange = (event) => {
                                    const challengeType = event.target.value,
                                          challenge = domainClaim.challenges.filter(c => c.type === challengeType)[0];
        
                                    empty(errors);
                                    empty(materials);
                                    
                                    switch (challengeType) {
                                        case 'dns-01':
                                            const dnsMat1 = document.createElement('li'),
                                                  dnsMat2 = document.createElement('li'),
                                                  dnsMat3 = document.createElement('li');
        
                                            challengeDesc.innerHTML = 'This challenges requires you to add a record in DNS';
                                            dnsMat1.innerHTML = 'Record type: TXT';
                                            dnsMat2.innerHTML = 'Name: ' + '<b>_acme-challenge</b><i>.' + domainClaim.domain + '</i>';
                                            dnsMat3.innerHTML = 'Value: ' + challenge.content;
        
                                            materials.appendChild(dnsMat1);
                                            materials.appendChild(dnsMat2);
                                            materials.appendChild(dnsMat3);
                                            break;
        
                                        case 'http-01':
                                            const httpMat1 = document.createElement('li'),
                                                  httpMat2 = document.createElement('li'),
                                                  httpMat3 = document.createElement('li'),
                                                  textLink = document.createElement('a'),
                                                  testLink = document.createElement('a'),
                                                  path = '/.well-known/acme-challenge/',
                                                  absoluteUrl = `http://${domainClaim.domain}${path}${challenge.title}`;
        
                                            //let absoluteUrl = `http://localhost:8081${path}${challenge.title}`;

                                            textLink.setAttribute('download', challenge.title);
                                            textLink.setAttribute('href', `data:application/octet-stream;charset=utf-8,${challenge.content}`);
                                            textLink.textContent = 'Download the test content';
                                            
                                            testLink.setAttribute('href', absoluteUrl);
                                            testLink.textContent = 'Test the file here';
                                            testLink.onclick = (event) => {
                                                event.preventDefault();
                                                fetch(absoluteUrl)
                                                    .then(res => {
                                                        res.text().then(text => alert(text === challenge.content ? 'pass' : 'fail'));
                                                    })
                                                    .catch(err => {
                                                        console.warn(err);
                                                        alert('fail');
                                                    });
                                            };

                                            challengeDesc.innerHTML = 'This challenge requires you to serve text over HTTP';
                                            httpMat1.appendChild(textLink);
                                            httpMat2.innerHTML = 'Serve the file on <b>http</b> under: ' + path;
                                            httpMat3.appendChild(testLink);
        
                                            materials.appendChild(httpMat1);
                                            materials.appendChild(httpMat2);
                                            materials.appendChild(httpMat3);
                                            break;
                                        default:
                                            errors.innerHTML = 'Unsupported challenge type: ' + challengeType;
                                            break;
                                    }
                                };
                                cmbChallenges.onchange = challengeChange;
                                challengeChange({ target: cmbChallenges });
        
                                submitChallenge.onclick = () => {
                                    modal.classList.add('loading');
                                    const dataset = cmbChallenges.selectedOptions[0].dataset;
                                    svc(true, 'challenge', 'POST', dataset)
                                        .then(() => obtain_edit_order(orderMeta).then(list_accounts))
                                        .catch(err => {
                                            errors.innerHTML = err.detail
                                                ? err.detail.map(d => d.message || d).join('<br>')
                                                : err.message || err;
                                        })
                                        .finally(() => modal.classList.remove('loading'));
                                };
                            };
                            cmbDomains.onchange = domainChange;
                            domainChange({ target: cmbDomains });

                            break;
                    }
                })
                .catch(err => {
                    errors.innerHTML = err.detail
                        ? err.detail.map(d => d.message || d).join('<br>')
                        : err.message || err;
                })
                .finally(() => {
                    modal.classList.remove('loading');
                })
        });
    }*/

    const list_grids_in_progress = () => {

        console.log('todo: list grids in progress');
    
        /*const targetZone = q2f('.accounts.zone');
        targetZone.classList.add('loading');

        svc(true, 'account', 'GET')
            .then(accounts => {

                empty(targetZone);
                accounts.forEach(acc => {

                    const elem_account = document.createElement('article'),
                        elem_accountTitle = document.createElement('h1'),
                        elem_emails = document.createElement('section'),
                        elem_orders = document.createElement('section'),
                        elem_addOrder = document.createElement('a');

                    let iterelem_email,
                        iterelem_order,
                        iterelem_orderTitle,
                        iterelem_domains,
                        iterelem_domain;

                    elem_accountTitle.textContent = acc.accountId;
                    elem_account.setAttribute('data-env', acc.isTest ? 'test' : 'live');
                    elem_account.onclick = (event) => {
                        obtain_add_edit_account(acc).then(json => {
                            empty(elem_emails);
                            acc.emails = json.emails;
                            json.emails.forEach(email => {
                                iterelem_email = document.createElement('span');
                                iterelem_email.textContent = email;
                                elem_emails.appendChild(iterelem_email);
                            });
                        });
                    }

                    elem_orders.classList.add('orders', 'zone');
                    elem_orders.onclick = (event) => { event.stopPropagation(); }
                    elem_addOrder.classList.add('add-order');
                    elem_addOrder.setAttribute('href', 'javascript:void(0)');
                    elem_addOrder.textContent = '+';
                    elem_addOrder.onclick = () => show_add_order(acc.accountId);
                                
                    acc.emails.forEach(email => {
                        iterelem_email = document.createElement('span');
                        iterelem_email.textContent = email;
                        elem_emails.appendChild(iterelem_email);
                    });

                    acc.orders.forEach(order => {

                        iterelem_order = document.createElement('article');
                        iterelem_orderTitle = document.createElement('h1');
                        iterelem_orderDelete = document.createElement('span');
                        iterelem_domains = document.createElement('section');

                        iterelem_orderTitle.textContent = order.orderId;
                        iterelem_orderDelete.innerHTML = '&times;';
                        iterelem_orderDelete.classList.add('delete');
                        iterelem_orderDelete.onclick = (event) => {
                            event.stopPropagation();
                            iterelem_order.classList.add('loading');
                            svc(true, `order/${order.orderId}`, 'DELETE')
                                .then(list_accounts)
                                .finally(() => iterelem_order.classList.remove('loading'));
                        }

                        iterelem_order.onclick = (event) => {
                            obtain_edit_order(order).then(list_accounts);
                        }

                        iterelem_order.appendChild(iterelem_orderTitle);
                        iterelem_order.appendChild(iterelem_orderDelete);
                        iterelem_order.appendChild(iterelem_domains);
                        elem_orders.appendChild(iterelem_order);

                        order.domains.forEach(domain => {
                            iterelem_domain = document.createElement('span');
                            iterelem_domain.textContent = domain;
                            iterelem_domains.appendChild(iterelem_domain);
                        });
                    });

                    if (acc.orders.length === 0) {
                        const elem_ordersEmpty = document.createElement('p');
                        elem_ordersEmpty.textContent = 'No orders found';
                        elem_orders.appendChild(elem_ordersEmpty);
                    }

                    elem_account.appendChild(elem_accountTitle);
                    elem_account.appendChild(elem_emails);
                    elem_orders.appendChild(elem_addOrder);
                    elem_account.appendChild(elem_orders);
                    targetZone.appendChild(elem_account);
                });

                if (accounts.length === 0) {
                    const elem_accountsEmpty = document.createElement('p');
                    elem_accountsEmpty.textContent = 'No accounts found';
                    targetZone.appendChild(elem_accountsEmpty);
                }

                const elem_addAccount = document.createElement('a');
                elem_addAccount.setAttribute('id', 'edit-account');
                elem_addAccount.setAttribute('href', 'javascript:void(0)');
                elem_addAccount.textContent = '+';
                elem_addAccount.onclick = show_add_edit_account;
                targetZone.appendChild(elem_addAccount);
            })
            .finally(() => {
                targetZone.classList.remove('loading');
            })*/
    }

    const show_login = () => obtain_login().then(list_grids_in_progress),
          show_register = () => obtain_registration().then(list_grids_in_progress);
          /*show_add_edit_account = (existing) => obtain_add_edit_account(existing).then(list_grids_in_progress),
          show_add_order = (accId) => obtain_add_order(accId).then(list_grids_in_progress);*/

    const logout = () => {
        wipe_token();
        empty(q2f('.accounts.zone'));
        q2f('body').classList.remove('auth');
        show_login();
    }

    window.addEventListener('load', () => {

        // return key submits modals
        q2a('.modal [type=button]').forEach(ctrl => {
            ctrl.closest('.modal').addEventListener('keypress', (event) => {
                if (event.target.type !== 'textarea' && event.keyCode === 13) {
                    ctrl.click();
                }
            });
        });

        // close secure modals on background click
        q2a('.secure > .modal').forEach(m =>
            m.onclick = () => {
                empty(q2f('.errors', m));
                m.classList.remove('open');
            });
        // prevent secure modal body clicks from propagating
        q2a('.secure > .modal > .body').forEach(m =>
            m.onclick = (event) => event.stopPropagation());

        q2f('#logout').onclick = logout;
        q2f('#login').onclick = show_login;
        q2f('#register').onclick = show_register;

        show_login();
    });

})(window);