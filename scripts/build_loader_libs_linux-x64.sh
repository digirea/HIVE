#!/bin/bash

# <<Setup>>
#
# Ubuntu 14.04
# $ sudo apt-get install libhdf5-dev
# 

topdir=`pwd`
installdir=`pwd`/third_party/local
c_compiler=mpicc
cxx_compiler=mpicxx
if [ -z "${CMAKE_BIN+x}" ]; then
  CMAKE_BIN=cmake
fi

function clean_install_dir {
	rm -rf ${installdir}
}

function build_tp {
	#
	# TextParser
	#
	cd third_party/ 
	cd TextParser/
	if [ -f "Makefile" ]; then
		make distclean
	fi

	# TODO: MPI build of TP.
	./configure --prefix=${installdir} && make && make install
	cd ${topdir}
}

function build_cdmlib {
	#
	# CDMlib
	#
	cd third_party/
	cd CDMlib/
	if [ -f "Makefile" ]; then
		make distclean
	fi
	CXX=${cxx_compiler} CC=${c_compiler} ./configure --prefix=${installdir} --with-parser=${installdir} --with-MPI=yes && make && make install
	cd ${topdir}
}

function build_polylib {
	#
	# Polylib
	#
	cd third_party/
	cd Polylib/
	if [ -f "Makefile" ]; then
		make distclean
	fi
	CXX=${cxx_compiler} CC=${c_compiler} ./configure --prefix=${installdir} --with-parser=${installdir} && make && make install
	cd ${topdir}
}
 
function build_bcmtools {
	#
	# BCMTools
	#
	cd third_party/
	cd BCMTools/
	if [ -f "Makefile" ]; then
		make distclean
	fi
	CXX=${cxx_compiler} CC=${c_compiler} ./configure --prefix=${installdir} --with-parser=${installdir} --with-polylib=${installdir} && make && make install
	cd ${topdir}
}

function build_hdmlib {
	#
	# HDMlib
	#
	cd third_party/
	cd HDMlib/
	if [ -f "Makefile" ]; then
		make distclean
	fi
	CXX=${cxx_compiler} CC=${c_compiler} ./configure --prefix=${installdir} --with-parser=${installdir} --with-bcm=${installdir} && make && make install
	cd ${topdir}
}

function build_pdmlib {
	cd third_party/
	rm -rf fpzip-1.0.1/
	tar -zxvf fpzip-1.0.1.tar.gz
	cd fpzip-1.0.1/src
	# TODO: Provide our own Makefile
	make
	cd ..
	cp -Rf inc/* ${installdir}/include/
	cp -Rf lib/* ${installdir}/lib/
	cd ${topdir}

	cd third_party/
	rm -rf Zoltan_v3.81/
	rm -rf Zoltan_build/
	tar -zxvf zoltan_distrib_v3.81.tar.gz
	mkdir Zoltan_build
	cd Zoltan_build
	CXX=${cxx_compiler} CC=${c_compiler} ../Zoltan_v3.81/configure --prefix=${installdir} && make && make install
	cd ${topdir}

	#
	# PDMlib
	#
	cd third_party/
	rm -rf PDMlib_build
	mkdir PDMlib_build
	cd PDMlib_build/
	CXX=${cxx_compiler} CC=${c_compiler} ${CMAKE_BIN} -DTP_ROOT=${installdir} -DFPZIP_ROOT=${installdir} -DZOLTAN_ROOT=${installdir} -DCMAKE_INSTALL_PREFIX=${installdir} ../PDMlib && make && make install
	cd ${topdir}
}

clean_install_dir
build_tp
build_cdmlib
build_polylib
build_bcmtools
build_hdmlib
build_pdmlib
